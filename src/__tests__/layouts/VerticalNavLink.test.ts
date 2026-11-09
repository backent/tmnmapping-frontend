import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import type { NavLink } from '@layouts/types'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/quotations', component: { template: '<div />' } },
  ],
})

const render = async (item: NavLink) => {
  await router.push('/')

  return mount(VerticalNavLink, {
    props: { item },
    global: { plugins: [router], stubs: { VIcon: true } },
  })
}

describe('VerticalNavLink', () => {
  // The menu item must be a real link, or Cmd/Ctrl-click, middle-click and
  // "Open in new tab" have nothing to open. Passing RouterLink an undefined href
  // used to wipe out the one it renders.
  it('renders a route item as a link with its href', async () => {
    const wrapper = await render({ title: 'Quotations', to: '/quotations' })

    expect(wrapper.get('a').attributes('href')).toBe('/quotations')
  })

  it('renders an external item with its href, target and rel', async () => {
    const wrapper = await render({ title: 'Docs', href: 'https://example.com', target: '_blank', rel: 'noopener' })
    const a = wrapper.get('a')

    expect(a.attributes('href')).toBe('https://example.com')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener')
  })
})
