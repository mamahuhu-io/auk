import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartInput from '../smart/Input.vue'

describe('AukSmartInput', () => {
  const defaultProps = {
    id: 'test-input',
    styles: '',
    inputStyles: 'input',
    type: 'text',
    label: '',
    disabled: false,
    autofocus: false,
  }

  it('renders properly', () => {
    const wrapper = mount(AukSmartInput, {
      props: {
        ...defaultProps,
        modelValue: '',
        placeholder: 'Enter text',
      },
    })

    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Enter text')
  })

  it('emits update:modelValue when input changes', async () => {
    const wrapper = mount(AukSmartInput, {
      props: {
        ...defaultProps,
        modelValue: '',
      },
    })

    const input = wrapper.find('input')
    await input.setValue('test value')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test value'])
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AukSmartInput, {
      props: {
        ...defaultProps,
        modelValue: '',
        disabled: true,
      },
    })

    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('shows correct input type', () => {
    const wrapper = mount(AukSmartInput, {
      props: {
        ...defaultProps,
        modelValue: '',
        type: 'password',
      },
    })

    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('password')
  })

  it('displays label when provided', () => {
    const wrapper = mount(AukSmartInput, {
      props: {
        ...defaultProps,
        modelValue: '',
        label: 'Username',
      },
    })

    const label = wrapper.find('label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Username')
  })
})
