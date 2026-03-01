import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import AukSmartItem from '../smart/Item.vue'

describe('AukSmartItem', () => {
  it('renders properly', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Test Item',
      },
    })

    expect(wrapper.text()).toContain('Test Item')
  })

  it('renders with icon', () => {
    const IconComponent = h('svg', { class: 'test-icon' })

    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Item with Icon',
        icon: IconComponent,
      },
    })

    expect(wrapper.html()).toContain('test-icon')
  })

  it('shows active state when active prop is true', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Active Item',
        active: true,
      },
    })

    // Check for hover:bg-primaryDark class which is applied
    expect(wrapper.html()).toContain('hover:bg-primaryDark')
  })

  it('shows loading state', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Loading Item',
        loading: true,
      },
    })

    expect(wrapper.html()).toContain('animate-spin')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Disabled Item',
        disabled: true,
      },
    })

    expect(wrapper.classes()).toContain('cursor-not-allowed')
    expect(wrapper.classes()).toContain('opacity-75')
  })

  it('renders description when provided', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Item',
        description: 'Item description',
      },
    })

    expect(wrapper.text()).toContain('Item description')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Clickable Item',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('renders with shortcut keys', () => {
    const wrapper = mount(AukSmartItem, {
      props: {
        label: 'Item',
        shortcut: ['Ctrl', 'S'],
      },
    })

    expect(wrapper.html()).toContain('Ctrl')
    expect(wrapper.html()).toContain('S')
  })
})
