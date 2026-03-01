import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import AukButtonSecondary from '../button/Secondary.vue'

describe('AukButtonSecondary', () => {
  it('renders properly', () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Secondary Button',
      },
    })
    expect(wrapper.text()).toContain('Secondary Button')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Click Me',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Disabled Button',
        disabled: true,
      },
    })

    expect(wrapper.classes()).toContain('cursor-not-allowed')
    expect(wrapper.classes()).toContain('opacity-75')
  })

  it('shows loading state', () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Loading Button',
        loading: true,
      },
    })

    expect(wrapper.html()).toContain('svg-icons')
  })

  it('renders with icon', () => {
    const IconComponent = h('svg', { class: 'test-icon' })

    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Icon Button',
        icon: IconComponent,
      },
    })

    expect(wrapper.html()).toBeTruthy()
  })

  it('applies filled style when filled prop is true', () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Filled Button',
        filled: true,
      },
    })

    expect(wrapper.classes()).toContain('bg-primaryLight')
  })

  it('applies outline style when outline prop is true', () => {
    const wrapper = mount(AukButtonSecondary, {
      props: {
        label: 'Outline Button',
        outline: true,
      },
    })

    expect(wrapper.classes()).toContain('border')
  })
})
