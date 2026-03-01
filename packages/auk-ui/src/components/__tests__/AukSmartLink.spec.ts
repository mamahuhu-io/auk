import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartLink from '../smart/Link.vue'

describe('AukSmartLink', () => {
  it('renders as button when no "to" prop is provided', () => {
    const wrapper = mount(AukSmartLink, {
      slots: {
        default: 'Click me',
      },
    })

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Click me')
  })

  it('renders as anchor tag when "to" prop is external URL', () => {
    const wrapper = mount(AukSmartLink, {
      props: {
        to: 'https://example.com',
      },
      slots: {
        default: 'External Link',
      },
    })

    const anchor = wrapper.find('a')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('href')).toBe('https://example.com')
  })

  it('opens in new tab when blank prop is true', () => {
    const wrapper = mount(AukSmartLink, {
      props: {
        to: 'https://example.com',
        blank: true,
      },
      slots: {
        default: 'External Link',
      },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener')
  })

  it('has correct accessibility attributes for button', () => {
    const wrapper = mount(AukSmartLink, {
      slots: {
        default: 'Button',
      },
    })

    const button = wrapper.find('button')
    expect(button.attributes('role')).toBe('button')
    expect(button.attributes('aria-label')).toBe('button')
  })

  it('has correct accessibility attributes for anchor', () => {
    const wrapper = mount(AukSmartLink, {
      props: {
        to: 'https://example.com',
      },
      slots: {
        default: 'Link',
      },
    })

    const anchor = wrapper.find('a')
    expect(anchor.attributes('role')).toBe('link')
    expect(anchor.attributes('aria-label')).toBe('Link')
  })

  it('passes through additional attributes', () => {
    const wrapper = mount(AukSmartLink, {
      props: {
        to: 'https://example.com',
      },
      attrs: {
        class: 'custom-class',
        'data-test': 'test-value',
      },
      slots: {
        default: 'Link',
      },
    })

    const anchor = wrapper.find('a')
    expect(anchor.classes()).toContain('custom-class')
    expect(anchor.attributes('data-test')).toBe('test-value')
  })
})
