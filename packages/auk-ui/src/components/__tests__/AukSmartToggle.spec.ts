import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartToggle from '../smart/Toggle.vue'

describe('AukSmartToggle', () => {
  it('renders properly', () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: false,
      },
      slots: {
        default: 'Toggle Label',
      },
    })

    expect(wrapper.text()).toContain('Toggle Label')
  })

  it('emits change event when clicked', async () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: false,
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('emits change event when Enter key is pressed', async () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: false,
      },
    })

    await wrapper.trigger('keyup.enter')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('shows on state when on prop is true', () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: true,
      },
    })

    const toggle = wrapper.find('.toggle')
    expect(toggle.classes()).toContain('on')
  })

  it('shows off state when on prop is false', () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: false,
      },
    })

    const toggle = wrapper.find('.toggle')
    expect(toggle.classes()).not.toContain('on')
  })

  it('has correct accessibility attributes', () => {
    const wrapper = mount(AukSmartToggle, {
      props: {
        on: false,
      },
    })

    expect(wrapper.attributes('tabindex')).toBe('0')
  })
})
