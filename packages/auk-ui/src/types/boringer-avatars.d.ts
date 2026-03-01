// Type definitions for @boringer-avatars/vue3
declare module '@boringer-avatars/vue3' {
  import { DefineComponent } from 'vue'

  export interface AvatarProps {
    size?: number
    name?: string
    square?: boolean
    colors?: string[]
    variant?: 'beam' | 'marble' | 'pixel' | 'sunset' | 'ring' | 'bauhaus'
  }

  export const Avatar: DefineComponent<AvatarProps>
  export default Avatar
}
