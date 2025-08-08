'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import ToastFade from './toast-fade'

export interface ToastType {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: ToastType[]
  addToast: (toast: Omit<ToastType, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string, action?: ToastType['action']) => void
  error: (title: string, message?: string, action?: ToastType['action']) => void
  info: (title: string, message?: string, action?: ToastType['action']) => void
  warning: (title: string, message?: string, action?: ToastType['action']) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<ToastType, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const success = useCallback((title: string, message?: string, action?: ToastType['action']) => {
    addToast({ type: 'success', title, message, action })
  }, [addToast])

  const error = useCallback((title: string, message?: string, action?: ToastType['action']) => {
    addToast({ type: 'error', title, message, action, duration: 8000 })
  }, [addToast])

  const info = useCallback((title: string, message?: string, action?: ToastType['action']) => {
    addToast({ type: 'info', title, message, action })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, action?: ToastType['action']) => {
    addToast({ type: 'warning', title, message, action })
  }, [addToast])

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      success,
      error,
      info,
      warning
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

const ToastContainer: React.FC<{
  toasts: ToastType[]
  onRemove: (id: string) => void
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto z-50 space-y-2 max-w-sm md:max-w-sm mx-auto md:mx-0 flex flex-col-reverse">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

const Toast: React.FC<{
  toast: ToastType
  onRemove: (id: string) => void
}> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-700/40 shadow-emerald-500/10'
      case 'error':
        return 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-700/40 shadow-rose-500/10'
      case 'warning':
        return 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-700/40 shadow-amber-500/10'
      case 'info':
      default:
        return 'bg-indigo-50/90 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-700/40 shadow-indigo-500/10'
    }
  }

  return (
    <ToastFade 
      blur={true} 
      duration={500} 
      easing="cubic-bezier(0.4, 0, 0.2, 1)" 
      delay={0}
      initialOpacity={0}
    >
      <div className={`${getBgColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline mt-2 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ToastFade>
  )
}