// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app'

describe('books service', () => {
  it('registered the service', () => {
    const service = app.service('books')

    assert.ok(service, 'Registered the service')
  })
})
