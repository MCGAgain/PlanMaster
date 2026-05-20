<template>
  <div class="wishes-view">
    <Header title="心愿兑换单">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增心愿
        </GlassButton>
      </template>
    </Header>

    <div class="wishes-content">
      <div class="balance-summary">
        <GlassCard class="balance-card">
          <span class="balance-label">当前余额</span>
          <span class="balance-value">{{ wishesStore.balance }}</span>
        </GlassCard>
      </div>

      <div class="wishes-list">
        <WishCard
          v-for="wish in wishesStore.activeWishes"
          :key="wish.id"
          :wish="wish"
          :balance="wishesStore.balance"
          @redeem="handleRedeem"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <GlassCard v-if="wishesStore.activeWishes.length === 0" class="empty-state">
        <p>暂无心愿，点击右上角添加</p>
      </GlassCard>
    </div>

    <GlassModal v-model="showAddModal" title="新增心愿">
      <WishForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>

    <GlassModal v-model="showEditModal" title="编辑心愿">
      <WishForm
        :wish="editingWish"
        @submit="handleUpdate"
        @cancel="showEditModal = false"
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useWishesStore } from '@/stores/wishes'
import Header from '@/components/layout/Header.vue'
import WishCard from '@/components/business/WishCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import WishForm from '@/components/forms/WishForm.vue'

const wishesStore = useWishesStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingWish = ref(null)

onMounted(() => {
  wishesStore.fetchWishes()
})

const handleRedeem = async (wish) => {
  if (confirm(`确定要兑换"${wish.name}"吗？`)) {
    await wishesStore.redeemWish(wish.id)
  }
}

const handleEdit = (wish) => {
  editingWish.value = wish
  showEditModal.value = true
}

const handleDelete = async (wish) => {
  if (confirm('确定要删除这个心愿吗？')) {
    await wishesStore.deleteWish(wish.id)
  }
}

const handleAdd = async (wish) => {
  await wishesStore.createWish(wish)
  showAddModal.value = false
}

const handleUpdate = async (wish) => {
  await wishesStore.updateWish(editingWish.value.id, wish)
  showEditModal.value = false
  editingWish.value = null
}
</script>

<style scoped>
.wishes-view {
  min-height: 100vh;
}

.wishes-content {
  padding: 2rem;
}

.balance-summary {
  margin-bottom: 2rem;
}

.balance-card {
  text-align: center;
  padding: 2rem;
}

.balance-label {
  display: block;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.balance-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wishes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
}
</style>
