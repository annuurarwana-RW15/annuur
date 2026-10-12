export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED'] as const

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]
