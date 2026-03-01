<template>
  <AukSmartModal
    v-if="show"
    dialog
    :title="t('app.cookies')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <AukSmartPlaceholder
        v-if="!currentInterceptorSupportsCookies"
        :src="`/images/states/${colorMode.value}/add_category.svg`"
        :alt="`${t('cookies.modal.interceptor_no_support')}`"
        :text="t('cookies.modal.interceptor_no_support')"
      >
        <template #body>
          <AppKernelInterceptor
            class="rounded border border-dividerLight p-2"
          />
        </template>
      </AukSmartPlaceholder>
      <div v-else class="flex flex-col">
        <div
          class="sticky -mx-4 -mt-4 flex space-x-2 border-b border-dividerLight bg-primary px-4 py-4"
          style="top: calc(-1 * var(--line-height-body))"
        >
          <AukSmartInput
            v-model="newDomainText"
            class="flex-1"
            :placeholder="t('cookies.modal.new_domain_name')"
            @keyup.enter="addNewDomain"
          />
          <AukButtonSecondary
            outline
            filled
            :label="t('action.add')"
            @click="addNewDomain"
          />
        </div>
        <div class="flex flex-col space-y-4">
          <AukSmartPlaceholder
            v-if="workingCookieJar.size === 0"
            :src="`/images/states/${colorMode.value}/blockchain.svg`"
            :alt="`${t('cookies.modal.empty_domains')}`"
            :text="t('cookies.modal.empty_domains')"
            class="mt-6"
          />
          <div
            v-for="[domain, entries] in workingCookieJar.entries()"
            v-else
            :key="domain"
            class="flex flex-col"
          >
            <div class="flex flex-1 items-center justify-between">
              <label class="p-4">
                {{ domain }}
              </label>
              <div class="flex">
                <AukButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.delete')"
                  :icon="IconTrash2"
                  @click="deleteDomain(domain)"
                />
                <AukButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('add.new')"
                  :icon="IconPlus"
                  @click="addCookieToDomain(domain)"
                />
              </div>
            </div>
            <div class="rounded border border-divider">
              <div class="divide-y divide-dividerLight">
                <div
                  v-if="entries.length === 0"
                  class="flex flex-col items-center gap-2 p-4"
                >
                  {{ t("cookies.modal.no_cookies_in_domain") }}
                </div>
                <template v-else>
                  <div
                    v-for="(entry, entryIndex) in entries"
                    :key="`${entry.name}-${entryIndex}`"
                    class="flex w-full divide-x divide-dividerLight items-center"
                  >
                    <input
                      class="flex flex-1 bg-transparent px-4 py-2"
                      :value="`${entry.name} => ${entry.value}`"
                      readonly
                    />
                    <AukButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.copy')"
                      :icon="IconCopy"
                      @click="copyCookie(entry)"
                    />
                    <AukButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.edit')"
                      :icon="IconEdit"
                      @click="editCookie(domain, entryIndex, entry)"
                    />
                    <AukButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.remove')"
                      :icon="IconTrash"
                      color="red"
                      @click="deleteCookie(domain, entryIndex)"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-if="currentInterceptorSupportsCookies" #footer>
      <span class="flex space-x-2">
        <AukButtonPrimary
          v-focus
          :label="t('action.save')"
          outline
          @click="saveCookieChanges"
        />
        <AukButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelCookieChanges"
        />
      </span>
      <AukButtonSecondary
        :label="t('action.clear_all')"
        outline
        filled
        @click="clearAllDomains"
      />
    </template>
  </AukSmartModal>
  <CookiesEditCookie
    :show="!!showEditModalFor"
    :entry="showEditModalFor"
    @save-cookie="saveCookie"
    @hide-modal="showEditModalFor = null"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { CookieJarService } from "~/services/cookie-jar.service"
import { Cookie } from "@auk/data"
import IconTrash from "~icons/lucide/trash"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlus from "~icons/lucide/plus"
import IconCopy from "~icons/lucide/copy"
import { cloneDeep } from "lodash-es"
import { ref, watch, computed } from "vue"
import { EditCookieConfig } from "./EditCookie.vue"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: "hide-modal"): void }>()

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const newDomainText = ref("")
const interceptorService = useService(KernelInterceptorService)
const cookieJarService = useService(CookieJarService)

const workingCookieJar = ref(cloneDeep(cookieJarService.cookieJar.value))

const currentInterceptorSupportsCookies = computed(() => {
  const caps = interceptorService.current.value?.capabilities
  return caps?.advanced?.has("cookies") ?? false
})

function addNewDomain() {
  if (newDomainText.value.trim() === "") {
    toast.error(`${t("cookies.modal.empty_domain")}`)
    return
  }
  workingCookieJar.value.set(newDomainText.value, [])
  newDomainText.value = ""
}

function deleteDomain(domain: string) {
  workingCookieJar.value.delete(domain)
}

function addCookieToDomain(domain: string) {
  showEditModalFor.value = { type: "create", domain }
}

function clearAllDomains() {
  workingCookieJar.value = new Map()
  toast.success(`${t("state.cleared")}`)
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      workingCookieJar.value = cloneDeep(cookieJarService.cookieJar.value)
    }
  }
)

const showEditModalFor = ref<EditCookieConfig | null>(null)

function saveCookieChanges() {
  cookieJarService.cookieJar.value = workingCookieJar.value
  hideModal()
}

function cancelCookieChanges() {
  hideModal()
}

function editCookie(domain: string, entryIndex: number, cookieEntry: Cookie) {
  showEditModalFor.value = {
    type: "edit",
    domain,
    entryIndex,
    currentCookieEntry: cookieEntry,
  }
}

function deleteCookie(domain: string, entryIndex: number) {
  const entry = workingCookieJar.value.get(domain)
  if (entry) entry.splice(entryIndex, 1)
}

function saveCookie(value: string) {
  if (showEditModalFor.value?.type === "create") {
    const { domain } = showEditModalFor.value
    const entry = workingCookieJar.value.get(domain)!

    const name = `Cookie-${entry.length}`
    entry.push(makeUICookie(domain, value, name))
    showEditModalFor.value = null
    return
  }
  if (showEditModalFor.value?.type === "edit") {
    const { domain, entryIndex } = showEditModalFor.value
    const entry = workingCookieJar.value.get(domain)
    if (entry) entry[entryIndex].value = value
    showEditModalFor.value = null
  }
}

function makeUICookie(domain: string, value: string, name: string): Cookie {
  return {
    name,
    value,
    domain,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }
}

function copyCookie(cookie: Cookie) {
  navigator.clipboard.writeText(`${cookie.name}=${cookie.value}`)
  toast.success(t("state.copied"))
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
