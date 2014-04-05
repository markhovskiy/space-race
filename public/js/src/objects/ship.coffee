define [
  'views/ship'
  'objects/bullet'
], (ShipView, Bullet) ->
  class Ship
    world: null

    defaults:
      coords: [ 100, 100 ]
      size: 40
      color: [ 0, 0, 0 ]
      moving_step: 4
      resizing_step: 2

    constructor: (@world, options) ->
      _.extend @, Backbone.Events

      @options = _.extend @defaults, options

      # a helper object to delegate partial rendering
      @view = new ShipView @world.ctx, @options.size

      @id = null

      # coords of object's center
      @coords = @options.coords

      # diameter [px]
      @size = @options.size

      # [ red, green, blue ]
      @color = @options.color

      @opacity = 0.4

      @moving_directions = up: no, down: no, left: no, right: no

      @shield_directions = _.clone @moving_directions

      @bullets_limit = 100

      # number of bullets in queue
      # ship can't produce more bullets than @bullets_limit
      @bullets_in_queue = 0

      # registry of bullets that a fired currently
      @bullets = []

      @initEvents()

    render: ->
      # draw both static and dynamic bodies
      @view.applyColor @color, @opacity
      @view.drawBody @coords
      @view.drawBody @coords, @size / Math.sqrt 2

      # draw a front arc for each moving direction
      @renderArcs 0.5, 0.4, @moving_directions

      # draw shields (directions are set on turning shields on)
      @renderArcs 0.8, 0.7, @shield_directions

      @view.showBulletsInQueue @coords, @bullets_in_queue

      @trigger 'render'

    renderArcs: (size_coef, angle_coef, by_directions) ->
      radius = @size * size_coef
      angle = Math.PI * angle_coef

      @view.drawFrontArc @coords, radius, angle, direction for direction, is_moving of by_directions when is_moving

    destroy: (callback) ->
      @listenTo @world, 'tick', ->
        if @opacity > 0
          @opacity -= 0.01
          return

        @stopListening()
        callback()

    move: (coords) ->
      @coords = coords
      @trigger 'move', coords: @coords

    shift: (direction) ->
      coords = @coords
      axis = +(direction in [ 'up', 'down' ])
      is_positive = +(direction in [ 'right', 'down' ])

      coords[axis] += @options.moving_step * (if is_positive then 1 else -1)

      @move coords

    isMoving: ->
      return yes for direction, is_moving of @moving_directions when is_moving
      no

    changeColor: ->
      for i of @color
        random_sign = Math.round(Math.random() * 2) - 1
        @color[i] = Math.min 100, @color[i] + random_sign * 10

    isFacingBound: (direction) ->
      @world.isObjectFacingBound @coords, @options.size, direction

    toggleShield: (to_proceed) ->
      for direction of @shield_directions
        if not to_proceed
          @shield_directions[direction] = no
          continue

        continue if @shield_directions[direction]

        # a shield can be activated only while moving along current directions
        @shield_directions[direction] = @moving_directions[direction]

    resize: ->
      if not @isMoving()
        if @size > @options.size
          @size -= @options.resizing_step * 2
      else if @size < @options.size * 4
        @size += @options.resizing_step

    queueBullet: ->
      @bullets_in_queue++ if @bullets_in_queue < @bullets_limit

    createBullet: (direction) ->
      bullet = new Bullet @world, _.clone(@coords), direction, color: @color

      @bullets.push bullet

      bullet.on 'stop', =>
        @bullets.shift()

    shot: ->
      for direction, is_moving of @moving_directions when is_moving and @bullets_in_queue
        @bullets_in_queue--
        @createBullet direction

      @trigger 'shot'

    initEvents: ->
      @listenTo @world, 'tick', ->
        @shift direction for direction, is_moving of @moving_directions when is_moving and not @isFacingBound direction

      @listenTo @world, 'tick', @resize

      @on 'control:shift', (data) ->
        @moving_directions[data.direction] = not data.to_stop
        @trigger 'stop' if data.to_stop and not @isMoving()

      @on 'control:shield', (data) ->
        @toggleShield not data.to_stop

      @on 'control:weapon', (data) ->
        # start/stop charging a gun
        @[if data.to_fire then 'stopListening' else 'listenTo'] @world, 'tick', @queueBullet

        # fire all bullets, one at a time
        @listenTo @world, 'tick', @shot if data.to_fire

      @on 'shot', ->
        @stopListening @world, 'tick', @shot unless 0 < @bullets_in_queue

      @on 'render', ->
        bullet.render() for bullet in @bullets when bullet
