import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  index() {
    return [
      {
        id: 1,
        username: 'virk',
      },
      {
        id: 2,
        username: 'romain',
      },
    ]
  }
  login({ request }: HttpContext) {
    const { username, password } = request.all()
    return {
      username,
      password,
    }
  }
}
