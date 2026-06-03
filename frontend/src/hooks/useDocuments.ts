import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pdfApi } from '@/services/api'
import toast from 'react-hot-toast'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await pdfApi.list()).data,
    // auto-refresh while any doc is processing
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined
      return data?.some((d) => d.status === 'processing') ? 3000 : false
    },
  })
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => (await pdfApi.get(id!)).data,
    enabled: !!id,
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pdfApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (p: number) => void
    }) => pdfApi.upload(file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('PDF uploaded — processing in background…')
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Upload failed'),
  })
}
