// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { BooksService } from './books.class'

// Main data model schema
export const booksSchema = Type.Object(
  {
    id: Type.Number(),
    text: Type.String()
  },
  { $id: 'Books', additionalProperties: false }
)
export type Books = Static<typeof booksSchema>
export const booksValidator = getValidator(booksSchema, dataValidator)
export const booksResolver = resolve<Books, HookContext<BooksService>>({})

export const booksExternalResolver = resolve<Books, HookContext<BooksService>>({})

// Schema for creating new entries
export const booksDataSchema = Type.Pick(booksSchema, ['text'], {
  $id: 'BooksData'
})
export type BooksData = Static<typeof booksDataSchema>
export const booksDataValidator = getValidator(booksDataSchema, dataValidator)
export const booksDataResolver = resolve<Books, HookContext<BooksService>>({})

// Schema for updating existing entries
export const booksPatchSchema = Type.Partial(booksSchema, {
  $id: 'BooksPatch'
})
export type BooksPatch = Static<typeof booksPatchSchema>
export const booksPatchValidator = getValidator(booksPatchSchema, dataValidator)
export const booksPatchResolver = resolve<Books, HookContext<BooksService>>({})

// Schema for allowed query properties
export const booksQueryProperties = Type.Pick(booksSchema, ['id', 'text'])
export const booksQuerySchema = Type.Intersect(
  [
    querySyntax(booksQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type BooksQuery = Static<typeof booksQuerySchema>
export const booksQueryValidator = getValidator(booksQuerySchema, queryValidator)
export const booksQueryResolver = resolve<BooksQuery, HookContext<BooksService>>({})
