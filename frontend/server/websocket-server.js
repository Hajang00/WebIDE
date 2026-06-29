import { WebSocketServer } from 'ws'
import { MongoClient } from 'mongodb'

const port = Number(process.env.WS_PORT ?? 8080)
const wss = new WebSocketServer({ port })

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
const mongoDbName = process.env.MONGODB_DB ?? 'webide'
const historyLimit = Number(process.env.CHAT_HISTORY_LIMIT ?? 100)

const clients = new Map()
const clientIds = new Map()
let chatCollection = null

function createClientId() {
  return `c-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

async function connectMongo() {
  try {
    const client = new MongoClient(mongoUri)
    await client.connect()
    const db = client.db(mongoDbName)
    chatCollection = db.collection('chat_messages')
    await chatCollection.createIndex({ createdAt: -1 })
    console.log(`MongoDB connected: ${mongoDbName}`)
  } catch (error) {
    console.error('MongoDB connection failed. Chat will run without persistence.')
    console.error(error)
  }
}

await connectMongo()

function nowTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function broadcast(payload) {
  const encoded = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded)
    }
  }
}

function sendOnlineCount() {
  broadcast({ type: 'online', count: wss.clients.size })
}

async function loadRecentMessages() {
  if (!chatCollection) {
    return []
  }

  const docs = await chatCollection
    .find({}, { projection: { user: 1, text: 1, at: 1, senderId: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(historyLimit)
    .toArray()

  return docs.reverse().map((doc) => ({
    id: String(doc._id),
    user: doc.user,
    text: doc.text,
    at: doc.at,
    senderId: doc.senderId ?? null
  }))
}

async function storeChatMessage(message) {
  if (!chatCollection) {
    return
  }

  await chatCollection.insertOne({
    user: message.user,
    text: message.text,
    at: message.at,
    senderId: message.senderId ?? null,
    createdAt: new Date()
  })
}

wss.on('connection', (socket) => {
  const initialName = `Guest-${Math.floor(1000 + Math.random() * 9000)}`
  const clientId = createClientId()
  clients.set(socket, initialName)
  clientIds.set(socket, clientId)

  socket.send(
    JSON.stringify({
      type: 'session',
      clientId
    })
  )

  loadRecentMessages()
    .then((messages) => {
      socket.send(
        JSON.stringify({
          type: 'history',
          messages
        })
      )
    })
    .catch(() => {
      socket.send(
        JSON.stringify({
          type: 'history',
          messages: []
        })
      )
    })

  socket.send(
    JSON.stringify({
      type: 'system',
      id: `sys-${Date.now()}`,
      user: 'System',
      text: `Connected to chat server as ${initialName}`,
      at: nowTimeLabel()
    })
  )

  broadcast({
    type: 'system',
    id: `join-${Date.now()}`,
    user: 'System',
    text: `${initialName} joined #general`,
    at: nowTimeLabel()
  })
  sendOnlineCount()

  socket.on('message', (raw) => {
    let payload

    try {
      payload = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (payload.type === 'set_name') {
      const nextName = String(payload.user || '').trim()
      if (!nextName) {
        return
      }
      const prevName = clients.get(socket) || initialName
      clients.set(socket, nextName)
      broadcast({
        type: 'system',
        id: `rename-${Date.now()}`,
        user: 'System',
        text: `${prevName} is now known as ${nextName}`,
        at: nowTimeLabel()
      })
      return
    }

    if (payload.type !== 'chat') {
      return
    }

    const text = String(payload.text || '').trim()
    if (!text) {
      return
    }

    const user = clients.get(socket) || initialName
    const senderId = clientIds.get(socket) || null
    const message = {
      type: 'chat',
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      user,
      text,
      at: nowTimeLabel(),
      senderId
    }

    storeChatMessage(message).catch(() => {
      console.error('Failed to persist chat message to MongoDB')
    })

    broadcast(message)
  })

  socket.on('close', () => {
    const user = clients.get(socket) || initialName
    clients.delete(socket)
    clientIds.delete(socket)
    broadcast({
      type: 'system',
      id: `left-${Date.now()}`,
      user: 'System',
      text: `${user} left #general`,
      at: nowTimeLabel()
    })
    sendOnlineCount()
  })
})

console.log(`WebSocket chat server running at ws://localhost:${port}`)
