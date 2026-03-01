import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartCheckbox from '../smart/Checkbox.vue'

describe('AukSmartCheckbox', () => {
  it('renders properly', () => {
    const wrapper = mount(AukSmartCheckbox, {
      props: {
        on: false,
        name: 'test-checkbox',
      },
      slots: {
        default: 'Accept terms',
      },
    })

    expect(wrapper.text()).toContain('Accept terms')
  })

  it('emits change event when clicked', async () => {
    const wrapper = mount(AukSmartCheckbox, {
      props: {
        on: false,
        name: 'test-checkbox',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AukSmartCheckbox, {
      props: {
        on: false,
        name: 'test-checkbox',
        disabled: true,
      },
    })

    // Check if the component has disabled styling
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('shows checked state', () => {
    const wrapper = mount(AukSmartCheckbox, {
      props: {
        on: true,
        name: 'test-checkbox',
      },
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.attributes('checked')).toBeDefined()
  })
})
