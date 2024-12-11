// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations'
import type { Books, BooksData, BooksPatch, BooksQuery } from './books.schema'

export type { Books, BooksData, BooksPatch, BooksQuery }

export interface BooksParams extends KnexAdapterParams<BooksQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class BooksService<ServiceParams extends Params = BooksParams> extends KnexService<
  Books,
  BooksData,
  BooksParams,
  BooksPatch
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('sqliteClient'),
    name: 'books'
  }
}
