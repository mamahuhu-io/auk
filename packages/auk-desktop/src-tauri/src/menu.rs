use serde::Deserialize;
use tauri::{
    menu::{
        AboutMetadata, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu, HELP_SUBMENU_ID,
        WINDOW_SUBMENU_ID,
    },
    AppHandle, Emitter, Runtime,
};

#[derive(Deserialize)]
pub struct MenuLabels {
    pub app: AppMenuLabels,
    pub file: FileMenuLabels,
    pub edit: EditMenuLabels,
    pub view: ViewMenuLabels,
    pub window: WindowMenuLabels,
    pub help: HelpMenuLabels,
}

#[derive(Deserialize)]
pub struct AppMenuLabels {
    pub about: String,
    pub settings: String,
    pub check_for_updates: String,
    pub services: String,
    pub hide: String,
    pub hide_others: String,
    pub quit: String,
}

#[derive(Deserialize)]
pub struct FileMenuLabels {
    pub label: String,
    pub close_window: String,
    pub quit: String,
}

#[derive(Deserialize)]
pub struct EditMenuLabels {
    pub label: String,
    pub undo: String,
    pub redo: String,
    pub cut: String,
    pub copy: String,
    pub paste: String,
    pub select_all: String,
}

#[derive(Deserialize)]
pub struct ViewMenuLabels {
    pub label: String,
    pub fullscreen: String,
}

#[derive(Deserialize)]
pub struct WindowMenuLabels {
    pub label: String,
    pub minimize: String,
    pub maximize: String,
    pub close_window: String,
}

#[derive(Deserialize)]
pub struct HelpMenuLabels {
    pub label: String,
    pub about: String,
    pub documentation: String,
    pub source_code: String,
    pub release_notes: String,
    pub report_issue: String,
}

#[tauri::command]
pub fn set_app_menu(app: tauri::AppHandle, labels: MenuLabels) -> Result<(), String> {
    apply_app_menu(&app, labels).map_err(|e| e.to_string())
}

pub fn apply_app_menu<R: Runtime>(app_handle: &AppHandle<R>, labels: MenuLabels) -> tauri::Result<()> {
    let menu = build_menu(app_handle, labels)?;
    let _ = app_handle.set_menu(menu)?;
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    if event.id() == "check_for_updates" {
        let _ = app.emit("menu-check-for-updates", ());
    } else if event.id() == "open_settings" {
        let _ = app.emit("menu-open-settings", ());
    } else if event.id() == "open_documentation" {
        let _ = crate::util::open_link("https://auk.mamahuhu.dev");
    } else if event.id() == "open_source_code" {
        let _ = crate::util::open_link("https://github.com/mamahuhu-io/auk");
    } else if event.id() == "open_release_notes" {
        let _ = crate::util::open_link("https://github.com/mamahuhu-io/auk/releases");
    } else if event.id() == "open_report_issue" {
        let _ = crate::util::open_link("https://github.com/mamahuhu-io/auk/issues/new");
    }
}

fn build_menu<R: Runtime>(app_handle: &AppHandle<R>, labels: MenuLabels) -> tauri::Result<Menu<R>> {
    #[allow(unused_variables)]
    let MenuLabels {
        app,
        file,
        edit,
        view,
        window,
        help,
    } = labels;

    let pkg_info = app_handle.package_info();
    let config = app_handle.config();
    let about_metadata = AboutMetadata {
        name: Some(pkg_info.name.clone()),
        version: Some(pkg_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    #[cfg(target_os = "macos")]
    let app_menu = Submenu::with_items(
        app_handle,
        pkg_info.name.clone(),
        true,
        &[
            &PredefinedMenuItem::about(
                app_handle,
                Some(app.about.as_str()),
                Some(about_metadata.clone()),
            )?,
            &PredefinedMenuItem::separator(app_handle)?,
            &MenuItem::with_id(
                app_handle,
                "open_settings",
                app.settings,
                true,
                Some("CmdOrCtrl+,"),
            )?,
            &MenuItem::with_id(
                app_handle,
                "check_for_updates",
                app.check_for_updates,
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::services(app_handle, Some(app.services.as_str()))?,
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::hide(app_handle, Some(app.hide.as_str()))?,
            &PredefinedMenuItem::hide_others(app_handle, Some(app.hide_others.as_str()))?,
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::quit(app_handle, Some(app.quit.as_str()))?,
        ],
    )?;

    #[cfg(not(any(
        target_os = "linux",
        target_os = "dragonfly",
        target_os = "freebsd",
        target_os = "netbsd",
        target_os = "openbsd"
    )))]
    let file_menu = Submenu::with_items(
        app_handle,
        file.label,
        true,
        &[
            &PredefinedMenuItem::close_window(app_handle, Some(file.close_window.as_str()))?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::quit(app_handle, Some(file.quit.as_str()))?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app_handle,
        edit.label,
        true,
        &[
            &PredefinedMenuItem::undo(app_handle, Some(edit.undo.as_str()))?,
            &PredefinedMenuItem::redo(app_handle, Some(edit.redo.as_str()))?,
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::cut(app_handle, Some(edit.cut.as_str()))?,
            &PredefinedMenuItem::copy(app_handle, Some(edit.copy.as_str()))?,
            &PredefinedMenuItem::paste(app_handle, Some(edit.paste.as_str()))?,
            &PredefinedMenuItem::select_all(app_handle, Some(edit.select_all.as_str()))?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    let view_menu = Submenu::with_items(
        app_handle,
        view.label,
        true,
        &[&PredefinedMenuItem::fullscreen(
            app_handle,
            Some(view.fullscreen.as_str()),
        )?],
    )?;

    let window_menu = Submenu::with_id_and_items(
        app_handle,
        WINDOW_SUBMENU_ID,
        window.label,
        true,
        &[
            &PredefinedMenuItem::minimize(app_handle, Some(window.minimize.as_str()))?,
            &PredefinedMenuItem::maximize(app_handle, Some(window.maximize.as_str()))?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app_handle)?,
            &PredefinedMenuItem::close_window(
                app_handle,
                Some(window.close_window.as_str()),
            )?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app_handle,
        HELP_SUBMENU_ID,
        help.label,
        true,
        &[
            &MenuItem::with_id(
                app_handle,
                "open_documentation",
                help.documentation,
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app_handle,
                "open_source_code",
                help.source_code,
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app_handle,
                "open_release_notes",
                help.release_notes,
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app_handle)?,
            &MenuItem::with_id(
                app_handle,
                "open_report_issue",
                help.report_issue,
                true,
                None::<&str>,
            )?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::separator(app_handle)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::about(
                app_handle,
                Some(help.about.as_str()),
                Some(about_metadata),
            )?,
        ],
    )?;

    let menu = Menu::with_items(
        app_handle,
        &[
            #[cfg(target_os = "macos")]
            &app_menu,
            #[cfg(not(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            )))]
            &file_menu,
            &edit_menu,
            #[cfg(target_os = "macos")]
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}
