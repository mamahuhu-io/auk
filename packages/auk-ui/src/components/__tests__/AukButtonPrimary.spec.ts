import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import AukButtonPrimary from '../button/Primary.vue'

describe('AukButtonPrimary', () => {
  it('renders properly', () => {
    const wrapper = mount(AukButtonPrimary, {
      props: {
        label: 'Test Button',
      },
    })
    expect(wrapper.text()).toContain('Test Button')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(AukButtonPrimary, {
      props: {
        label: 'Click Me',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AukButtonPrimary, {
      props: {
        label: 'Disabled Button',
        disabled: true,
      },
    })

    // Check if the component has disabled class
    expect(wrapper.classes()).toContain('cursor-not-allowed')
    expect(wrapper.classes()).toContain('opacity-75')
  })

  it('shows loading state', () => {
    const wrapper = mount(AukButtonPrimary, {
      props: {
        label: 'Loading Button',
        loading: true,
      },
    })

    expect(wrapper.html()).toContain('svg-icons')
  })

  it('renders with icon', () => {
    // Create a simple icon component
    const IconComponent = h('svg', { class: 'test-icon' })

    const wrapper = mount(AukButtonPrimary, {
      props: {
        label: 'Icon Button',
        icon: IconComponent,
      },
    })

    expect(wrapper.html()).toBeTruthy()
  })
})
