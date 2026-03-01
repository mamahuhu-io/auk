import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartSpinner from '../smart/Spinner.vue'

describe('AukSmartSpinner', () => {
  it('renders properly', () => {
    const wrapper = mount(AukSmartSpinner)

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('has correct SVG structure', () => {
    const wrapper = mount(AukSmartSpinner)

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.classes()).toContain('animate-spin')
  })

  it('has svg-icons class', () => {
    const wrapper = mount(AukSmartSpinner)

    const svg = wrapper.find('svg')
    expect(svg.classes()).toContain('svg-icons')
  })

  it('renders as an icon component', () => {
    const wrapper = mount(AukSmartSpinner)

    // The component uses IconLucideLoader which is an SVG icon
    expect(wrapper.html()).toContain('svg')
  })
})
