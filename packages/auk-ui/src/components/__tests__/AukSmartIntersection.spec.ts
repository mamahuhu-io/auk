import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AukSmartIntersection from '../smart/Intersection.vue'

describe('AukSmartIntersection', () => {
  let mockIntersectionObserver: any

  beforeEach(() => {
    // Mock IntersectionObserver
    mockIntersectionObserver = vi.fn(function(callback) {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })
    ;(globalThis as any).IntersectionObserver = mockIntersectionObserver
  })

  it('renders properly', () => {
    const wrapper = mount(AukSmartIntersection, {
      slots: {
        default: '<div>Content</div>',
      },
    })

    expect(wrapper.html()).toContain('Content')
  })

  it('has correct root element', () => {
    const wrapper = mount(AukSmartIntersection, {
      slots: {
        default: '<div>Content</div>',
      },
    })

    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('renders slot content', () => {
    const wrapper = mount(AukSmartIntersection, {
      slots: {
        default: '<p class="test-content">Test Content</p>',
      },
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test Content')
  })

  it('creates IntersectionObserver on mount', () => {
    mount(AukSmartIntersection, {
      slots: {
        default: '<div>Content</div>',
      },
    })

    // Verify IntersectionObserver was created
    expect(mockIntersectionObserver).toHaveBeenCalled()
  })

  it('observes the container element', () => {
    const observeMock = vi.fn()
    mockIntersectionObserver = vi.fn(function() {
      return {
        observe: observeMock,
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })
    ;(globalThis as any).IntersectionObserver = mockIntersectionObserver

    mount(AukSmartIntersection, {
      slots: {
        default: '<div>Content</div>',
      },
    })

    expect(observeMock).toHaveBeenCalled()
  })
})
