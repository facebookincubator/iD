iD.modes.DrawArea = function(wayId) {
    var mode = {
        button: 'area',
        id: 'draw-area'
    };

    var keybinding = d3.keybinding('draw-area');

    mode.enter = function() {
        var map = mode.map,
            surface = map.surface,
            history = mode.history,
            controller = mode.controller,
            way = history.graph().entity(wayId),
            headId = (way.nodes.length == 1) ?
                way.nodes[0] :
                way.nodes[way.nodes.length - 2],
            tailId = way.first(),
            node = iD.Node({loc: map.mouseCoordinates()});

        map.dblclickEnable(false)
            .fastEnable(false);
        map.tail('Click to add points to your area. Click the first point to finish the area.');

        history.perform(
            iD.actions.AddNode(node),
            iD.actions.AddWayNode(way.id, node.id, -1));

        surface.selectAll('.way, .node')
            .filter(function (d) { return d.id === wayId || d.id === node.id; })
            .classed('active', true);

        function mousemove() {
            history.replace(iD.actions.MoveNode(node.id, map.mouseCoordinates()));
        }

        function mouseover() {
            var datum = d3.select(d3.event.target).datum() || {};
            d3.select('#map').classed('finish-area', datum.id === tailId);
        }

        function click() {
            var datum = d3.select(d3.event.target).datum() || {};

            if (datum.id === tailId || datum.id === headId) {
                if (way.nodes.length > 3) {
                    history.undo();
                    controller.enter(iD.modes.Select(way, true));
                } else {
                    // Areas with less than 3 nodes gets deleted
                    history.replace(iD.actions.DeleteWay(way.id));
                    controller.enter(iD.modes.Browse());
                }

            } else if (datum.type === 'node' && datum.id !== node.id) {
                // connect the way to an existing node
                history.replace(
                    iD.actions.DeleteNode(node.id),
                    iD.actions.AddWayNode(way.id, datum.id, -1),
                    way.nodes.length > 2 ? 'added to an area' : '');

                controller.enter(iD.modes.DrawArea(wayId));

            } else {
                history.replace(
                    iD.actions.Noop(),
                    way.nodes.length > 2 ? 'added to an area' : '');

                controller.enter(iD.modes.DrawArea(wayId));
            }
        }

        function backspace() {
            d3.event.preventDefault();

            history.replace(
                iD.actions.DeleteNode(node.id),
                iD.actions.DeleteNode(headId));

            if (history.graph().fetch(wayId).nodes.length === 2) {
                history.replace(
                    iD.actions.DeleteNode(way.nodes[0]),
                    iD.actions.DeleteWay(wayId));
                controller.enter(iD.modes.Browse());
            } else {
                controller.enter(iD.modes.DrawArea(wayId));
            }
        }

        function del() {
            d3.event.preventDefault();
            history.replace(iD.actions.DeleteWay(wayId));
            controller.enter(iD.modes.Browse());
        }

        function ret() {
            d3.event.preventDefault();
            history.replace(iD.actions.DeleteNode(node.id));
            controller.enter(iD.modes.Select(way, true));
        }

        surface
            .on('mousemove.drawarea', mousemove)
            .on('mouseover.drawarea', mouseover)
            .on('click.drawarea', click);

        keybinding
            .on('⌫', backspace)
            .on('⌦', del)
            .on('⎋', ret)
            .on('↩', ret);

        d3.select(document)
            .call(keybinding);

        history.on('undone.drawline', function () {
            controller.enter(iD.modes.Browse());
        });
    };

    mode.exit = function() {
        var map = mode.map,
            surface = map.surface,
            history = mode.history;

        surface.selectAll('.way, .node')
            .classed('active', false);

        map.tail(false);
        map.fastEnable(true);

        surface
            .on('mousemove.drawarea', null)
            .on('click.drawarea', null);

        keybinding.off();

        history.on('undone.drawline', null);

        window.setTimeout(function() {
            mode.map.dblclickEnable(true);
        }, 1000);
    };

    return mode;
};
