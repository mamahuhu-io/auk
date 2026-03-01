import { defineComponent, PropType } from "vue"

interface ResponseWithBody {
  body: string | ArrayBuffer
}

export default defineComponent({
  props: {
    response: {
      type: Object as PropType<ResponseWithBody>,
      required: true,
    },
  },
  computed: {
    responseBodyText(): string {
      if (typeof this.response.body === "string") return this.response.body

      const res = new TextDecoder("utf-8").decode(this.response.body)

      // HACK: Temporary trailing null character issue from the extension fix
      return res.replace(/\0+$/, "")
    },
  },
})
