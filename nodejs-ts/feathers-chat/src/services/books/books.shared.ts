// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Books, BooksData, BooksPatch, BooksQuery, BooksService } from './books.class'

export type { Books, BooksData, BooksPatch, BooksQuery }

export type BooksClientService = Pick<BooksService<Params<BooksQuery>>, (typeof booksMethods)[number]>

export const booksPath = 'books'

export const booksMethods: Array<keyof BooksService> = ['find', 'get', 'create', 'patch', 'remove']

export const booksClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(booksPath, connection.service(booksPath), {
    methods: booksMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [booksPath]: BooksClientService
  }
}
