'use client'

import React, { createContext, useContext, useState } from 'react'

interface EditContextType {
  isEditMode: boolean
  enableEditMode: () => void
  disableEditMode: () => void
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
}

const EditContext = createContext<EditContextType | undefined>(undefined)

export function EditProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const enableEditMode = () => {
    setIsEditMode(true)
  }

  const disableEditMode = () => {
    setIsEditMode(false)
    setHasUnsavedChanges(false)
  }

  return (
    <EditContext.Provider 
      value={{ 
        isEditMode, 
        enableEditMode, 
        disableEditMode,
        hasUnsavedChanges,
        setHasUnsavedChanges
      }}
    >
      {children}
    </EditContext.Provider>
  )
}

export function useEdit() {
  const context = useContext(EditContext)
  if (context === undefined) {
    throw new Error('useEdit must be used within an EditProvider')
  }
  return context
}
