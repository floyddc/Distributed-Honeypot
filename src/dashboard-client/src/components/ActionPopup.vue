<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  message: { type: String, required: true },
  confirm: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const close = () => { isOpen.value = false }
const onConfirm = () => { emit('confirm'); isOpen.value = false }
const onCancel = () => { emit('cancel'); isOpen.value = false }
</script>

<template>
  <transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60" @click="close" aria-hidden="true"></div>

      <div class="relative bg-[rgba(22,21,21,0.95)] border border-[#5fbfbb] rounded-lg shadow-lg max-w-lg w-full mx-4 p-6" role="dialog" aria-modal="true">
        <div class="mb-4 text-gray-200 text-sm">
          {{ message }}
        </div>

        <div class="flex justify-end space-x-2">
          <button v-if="props.confirm" @click="onCancel" class="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">Cancel</button>
          <button @click="props.confirm ? onConfirm() : close()" class="px-3 py-2 rounded bg-[#5fbfbb] hover:bg-[#4fa9a5] text-[rgba(22,21,21,0.9)] font-medium">{{ props.confirm ? 'Confirm' : 'OK' }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; }
</style>
