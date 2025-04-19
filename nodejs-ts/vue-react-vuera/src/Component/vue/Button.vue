<template>
  <button class="button" @click="handleClick" :type="props.type" :disabled="props.disabled">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
// defineEmitsを使用して、コンポーネントが発行するイベントを定義
const emit = defineEmits<{
  (e: "click", event: MouseEvent): void; // イベント名とペイロードの型を定義
}>();

// definePropsを使用して、受け入れるプロパティとその型、デフォルト値を定義
const props = defineProps({
  type: {
    type: String as () => "button" | "submit" | "reset", // ボタンのタイプ（より厳密な型定義）
    default: "button",
    validator: (value: string) => ["button", "submit", "reset"].includes(value), // 値の検証（オプション）
  },
  disabled: {
    type: Boolean,
    default: false, // デフォルトは無効化されていない状態
  },
});

// ボタンクリック時に'click'イベントを発行するハンドラ
const handleClick = (event: MouseEvent) => {
  // disabled 상태일 때는 이벤트를 발생시키지 않도록 할 수도 있지만,
  // 네이티브 버튼 요소가 이미 비활성화 상태에서 클릭 이벤트를 막아줍니다.
  // 必要であれば props.disabled チェックを追加: if (props.disabled) return;
  emit("click", event); // 'click' イベントを発行し、元の MouseEvent オブジェクトを渡す
};
</script>

<style scoped>
.button {
  /* 基本的なスタイル */
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: inherit;
  /* 親要素のフォントサイズを継承 */
  line-height: inherit;
  /* 親要素の行の高さを継承 */
  font-family: inherit;
  /* 親要素のフォントファミリーを継承 */
}

.button:hover:not(:disabled) {
  /* disabledでない場合のみhoverスタイルを適用 */
  background-color: #e0e0e0;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
