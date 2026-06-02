import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '../../api/templates'
import type { CreateTemplatePayload } from '../../api/templates'

export const TEMPLATES_KEY = ['templates'] as const

export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => templatesApi.list(),
    staleTime: 60_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => templatesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  })
}
