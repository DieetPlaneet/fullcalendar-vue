import {
  PropType,
  defineComponent,
  h,
  Slots,
  ref,
  onMounted,
  onBeforeUpdate,
  onBeforeUnmount,
  watch, Component,
} from 'vue'
import {Calendar, CalendarOptions} from '@fullcalendar/core'
import {mapHash, shallowCopy} from './utils'
import {wrapVDomGenerator, createVueContentTypePlugin} from './custom-content-type'
import {OPTION_IS_COMPLEX} from "./options";

const FullCalendar: Component = defineComponent({
  props: {
    options: Object as PropType<CalendarOptions>
  },
  render() {
    return h('div', {
      ref: 'calendarWrapper',
      // when renderId is changed, Vue will trigger a real-DOM async rerender, calling beforeUpdate/updated
      attrs: {'data-fc-render-id': this.renderId}
    })
  },
  setup(props, context) {
    const api = ref<Calendar | null>(null);
    const slotsOptions = ref<Slots | null>(null);
    const calendarWrapper = ref<HTMLElement | null>(null);
    const renderId = ref(0);

    //const events = typeof props.options?.events === 'object' ? reactive(props.options?.events) : computed(() => props.options?.events);

    const buildOptions = (
      suppliedOptions: CalendarOptions | undefined,
    ): CalendarOptions => {
      suppliedOptions = suppliedOptions || {}
      return {
        ...slotsOptions.value,
        ...suppliedOptions, // spread will pull out the values from the options getter functions
        plugins: (suppliedOptions.plugins || []).concat([createVueContentTypePlugin()])
      }
    };

    const getApi = () => {
      return api.value;
    };

    onMounted(() => {
      slotsOptions.value = mapHash(context.slots, wrapVDomGenerator) // needed for buildOptions

      let calendarOptions = buildOptions(props.options)
      let calendar = new Calendar((calendarWrapper.value as unknown) as HTMLElement, calendarOptions)
      api.value = calendar
      calendar.render()
    });

    onBeforeUpdate(() => {
      getApi()?.resumeRendering() // the watcher handlers paused it
    });

    onBeforeUnmount(() => {
      getApi()?.destroy()
    });

    watch(() => props.options, (newValues, prevValues) => {
        getApi()?.pauseRendering()

        let calendarOptions = buildOptions(props.options)
        getApi()?.resetOptions(calendarOptions)

        renderId.value++ // will queue a rerender
      },
      {deep: true})


    for (let complexOptionName in OPTION_IS_COMPLEX) {
      if (props.options && complexOptionName in props.options) {
        let propVal = props.options[complexOptionName as keyof typeof props.options]

        if (props.options) {
          watch(() => propVal, (newValues, prevValues) => {
              getApi()?.pauseRendering()
              getApi()?.resetOptions({
                // the only reason we shallow-copy is to trick FC into knowing there's a nested change.
                // TODO: future versions of FC will more gracefully handle event option-changes that are same-reference.
                [complexOptionName]: shallowCopy(propVal)
              }, true)

              renderId.value++ // will queue a rerender
            },
            {deep: true})
        }

      }
    }

    return {renderId, calendarWrapper, buildOptions, getApi, api, slotsOptions};
  }
})

export default FullCalendar
