import { useState } from 'react'

export function useGrpoModals() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSearch, setModalSearch] = useState('')

  return {
    modalOpen,
    setModalOpen,
    modalSearch,
    setModalSearch,
  }
}
