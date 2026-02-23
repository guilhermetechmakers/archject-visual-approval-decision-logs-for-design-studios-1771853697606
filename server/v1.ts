import { Router } from 'express'
import { actionsRouter } from './actions.js'
import { exportsRouter } from './exports-api.js'
import { clientRouter } from './client-api.js'
import { clientTokenRouter } from './client-token.js'
import { decisionsApiRouter } from './decisions-api.js'

export const v1Router = Router()

v1Router.use(actionsRouter)
v1Router.use(exportsRouter)
v1Router.use(clientRouter)
v1Router.use(clientTokenRouter)
v1Router.use(decisionsApiRouter)
