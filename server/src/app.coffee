_ = require 'underscore'
server = require './server'
io = require('socket.io').listen server
Ship = require './objects/ship'
ClientShipDecorator = require './objects/client_ship_decorator'
Registry = require './objects/registry'

registry = new Registry Ship

to_client_data = (ship) ->
  (new ClientShipDecorator ship, 'id', 'coords').toJSON()

io.sockets.on 'connection', (socket) ->
  id = null

  socket.on 'identify', (data) ->
    id = data.id
    ship = registry.get id

    unless ship
      ship = registry.create()
      id = ship.id

    client_ship_data = to_client_data ship

    socket.emit 'register', client_ship_data
    socket.broadcast.emit 'create', client_ship_data

    # @todo: introduce "createBunch" to send all the data in one message
    _.each _.omit(registry.all(), id.toString()), (other_ship) ->
      socket.emit 'create', to_client_data other_ship

  socket.on 'disconnect', ->
    return unless id
    registry.remove id
    socket.broadcast.emit 'remove', id: id

  socket.on 'shift', (data) ->
    return unless id
    socket.broadcast.emit 'shift', _.extend data, id: id

  socket.on 'move', (data) ->
    return unless id
    ship = registry.get id
    ship.move data.coords
