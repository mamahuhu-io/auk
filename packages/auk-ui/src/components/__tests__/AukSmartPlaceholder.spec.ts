import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartPlaceholder from '../smart/Placeholder.vue'

describe('AukSmartPlaceholder', () => {
  it('renders properly', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'No data available',
      },
    })

    expect(wrapper.text()).toContain('No data available')
  })

  it('renders with image source', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Empty state',
        src: '/test-image.png',
        alt: 'Test image',
      },
    })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/test-image.png')
    expect(img.attributes('alt')).toBe('Test image')
  })

  it('renders heading when provided', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Description text',
        heading: 'Main Heading',
      },
    })

    expect(wrapper.text()).toContain('Main Heading')
    expect(wrapper.text()).toContain('Description text')
  })

  it('renders body slot content', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Placeholder text',
      },
      slots: {
        body: '<button>Action Button</button>',
        icon: '<svg />',
      },
    })

    expect(wrapper.html()).toContain('Action Button')
  })

  it('renders icon slot content', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Placeholder text',
      },
      slots: {
        icon: '<svg class="test-icon"></svg>',
        body: '<div />',
      },
    })

    expect(wrapper.html()).toContain('test-icon')
  })

  it('has correct structure', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Test',
      },
    })

    expect(wrapper.find('.flex').exists()).toBe(true)
    expect(wrapper.find('.flex-col').exists()).toBe(true)
  })

  it('applies large class when large prop is true', () => {
    const wrapper = mount(AukSmartPlaceholder, {
      props: {
        text: 'Test',
        src: '/image.png',
        large: true,
      },
    })

    const img = wrapper.find('img')
    expect(img.classes()).toContain('h-32')
    expect(img.classes()).toContain('w-32')
  })
})
