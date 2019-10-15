let _ = require('lodash');
let $ = require('jquery');
require('vtk.js');
let widgets = require('@jupyter-widgets/base');
let controls = require('@jupyter-widgets/controls');

let rsdbg = console.log.bind(console);
let rslog = console.log.bind(console);

var template = [
    '<div style="border-style: solid; border-color: blue; border-width: 1px;">',
        '<div class="viewer-title" style="font-weight: normal; text-align: center"></div>',
        '<div style="margin: 1em;">',
            '<div class="vtk-content"></div>',
        '</div>',
    '</div>'
].join('');


function indexArray(size) {
    var res = [];
    for (var i = 0; i < size; i++) {
      res.push(i);
    }
    return res;
}

function toPolyData(json) {
    let colors = [];
    for (var i = 0; i < json.lines.colors.length; i++) {
      colors.push(Math.floor(255 * json.lines.colors[i]));
    }
    for (var i = 0; i < json.polygons.colors.length; i++) {
      colors.push(Math.floor(255 * json.polygons.colors[i]));
    }

    let polys = [];
    var polyIdx = 0;
    let polyInds = indexArray(json.polygons.vertices.length / 3);
    for (var i = 0; i < json.polygons.lengths.length; i++) {
        var len = json.polygons.lengths[i];
        polys.push(len);
        for (var j = 0; j < len; j++) {
            polys.push(polyInds[polyIdx]);
            polyIdx++;
        }
    }
    polys = new window.Uint32Array(polys);

    let points = json.polygons.vertices;
    let lineVertOffset = points.length / 3;
    for (var i = 0; i < json.lines.vertices.length; i++) {
        points.push(json.lines.vertices[i]);
    }
    let lines = [];
    var lineIdx = 0;
    let lineInds = indexArray(json.lines.vertices.length / 3);
    for (var i = 0; i < json.lines.lengths.length; i++) {
        var len = json.lines.lengths[i];
        lines.push(len);
        for (var j = 0; j < len; j++) {
            lines.push(lineInds[lineIdx] + lineVertOffset);
            lineIdx++;
        }
    }
    lines = new window.Uint32Array(lines);
    points = new window.Float32Array(points);

    let pd = vtk.Common.DataModel.vtkPolyData.newInstance();
    pd.getPoints().setData(points, 3);
    pd.getLines().setData(lines);
    pd.getPolys().setData(polys);

    pd.getCellData().setScalars(vtk.Common.Core.vtkDataArray.newInstance({
      numberOfComponents: 3,
      values: colors,
      dataType: vtk.Common.Core.vtkDataArray.VtkDataTypes.UNSIGNED_CHAR
    }));

    return pd;
}

// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.

// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var VTKModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'VTKModel',
        _view_name : 'VTKView',
        _model_module : 'jupyter-rs-vtk-widget',
        _view_module : 'jupyter-rs-vtk-widget',
        _model_module_version : '0.0.1',
        _view_module_version : '0.0.1',
        bg_color: '#fffaed',
        marker_visible: true,
        title: ''
    })
});


// Custom View. Renders the widget model.
var VTKView = widgets.DOMWidgetView.extend({

    fsRenderer: null,
    isLoaded: false,
    orientationMarker: null,

    handleCustomMessages: function(msg) {
        if (msg.type == 'axis') {
            this.setAxis(msg.axis, msg.dir);
        }

        if (msg.type === 'debug') {
            rsdbg(msg.msg);
        }

        if (msg.type === 'refresh') {
            rsdbg('msg rfrs');
            //this.refresh();
        }

        if (msg.type === 'reset') {
            this.resetView();
        }

    },

    setData: function(d) {
        this.model.set('model_data', d);
        this.refresh();
    },

    refresh: function(o) {

        //rsdbg(this.model.get('title'), 'REFRESH');
        if (! this.fsRenderer) {
            this.fsRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
                container: $(this.el).find('.vtk-content')[0],
            });
            this.setBgColor();
        }

        if (! this.orientationMarker) {
            this.orientationMarker = vtk.Interaction.Widgets.vtkOrientationMarkerWidget.newInstance({
                actor: vtk.Rendering.Core.vtkAxesActor.newInstance(),
                interactor: this.fsRenderer.getRenderWindow().getInteractor()
            });
            this.orientationMarker.setEnabled(true);
            this.orientationMarker.setViewportCorner(
                vtk.Interaction.Widgets.vtkOrientationMarkerWidget.Corners.TOP_RIGHT
            );
            this.orientationMarker.setViewportSize(0.08);
            this.orientationMarker.setMinPixelSize(100);
            this.orientationMarker.setMaxPixelSize(300);
        }

        this.removeActors();
        let sceneData = this.model.get('model_data');
        if ($.isEmptyObject(sceneData)) {
            rslog('No data');
            this.fsRenderer.getRenderWindow().render();
            return;
        }
        let pData = toPolyData(sceneData);

        //vv to radia class? vv//
        /*
        let colors = [];
        for (var i = 0; i < sceneData.lines.colors.length; i++) {
          colors.push(Math.floor(255 * sceneData.lines.colors[i]));
        }
        for (var i = 0; i < sceneData.polygons.colors.length; i++) {
          colors.push(Math.floor(255 * sceneData.polygons.colors[i]));
        }

        var polys = [];
        var polyIdx = 0;
        var polyInds = indexArray(sceneData.polygons.vertices.length / 3);
        for (var i = 0; i < sceneData.polygons.lengths.length; i++) {
            var len = sceneData.polygons.lengths[i];
            polys.push(len);
            for (var j = 0; j < len; j++) {
                polys.push(polyInds[polyIdx]);
                polyIdx++;
            }
        }
        polys = new window.Uint32Array(polys);

        let points = sceneData.polygons.vertices;
        var lineVertOffset = points.length / 3;
        for (var i = 0; i < sceneData.lines.vertices.length; i++) {
            points.push(sceneData.lines.vertices[i]);
        }
        var lines = [];
        var lineIdx = 0;
        var lineInds = indexArray(sceneData.lines.vertices.length / 3);
        for (var i = 0; i < sceneData.lines.lengths.length; i++) {
            var len = sceneData.lines.lengths[i];
            lines.push(len);
            for (var j = 0; j < len; j++) {
                lines.push(lineInds[lineIdx] + lineVertOffset);
                lineIdx++;
            }
        }
        lines = new window.Uint32Array(lines);
        points = new window.Float32Array(points);

        var pd = vtk.Common.DataModel.vtkPolyData.newInstance();
        pd.getPoints().setData(points, 3);
        pd.getLines().setData(lines);
        pd.getPolys().setData(polys);

        pd.getCellData().setScalars(vtk.Common.Core.vtkDataArray.newInstance({
          numberOfComponents: 3,
          values: colors,
          dataType: vtk.Common.Core.vtkDataArray.VtkDataTypes.UNSIGNED_CHAR
        }));
        //^^ to raida class? ^^//
        */

        var mapper = vtk.Rendering.Core.vtkMapper.newInstance();
        var actor = vtk.Rendering.Core.vtkActor.newInstance();
        //mapper.setInputData(pd);
        mapper.setInputData(pData);
        actor.setMapper(mapper);

        actor.getProperty().setEdgeVisibility(true);
        this.fsRenderer.getRenderer().addActor(actor);
        this.resetView();
    },

    removeActors: function() {
        let r = this.fsRenderer.getRenderer();
        r.getActors().forEach(function(actor) {
            r.removeActor(actor);
        });
    },

    render: function() {
        //rsdbg(this.model.get('title'), 'RENDER');
        this.model.on('change:title', this.refresh, this);
        this.model.on('change:model_data', this.refresh, this);
        this.model.on('change:bg_color', this.setBgColor, this);
        this.model.on('change:marker_visible', this.toggleOrientationMarker, this);
        if (! this.isLoaded) {
            $(this.el).append($(template));
            this.setTitle();
            this.isLoaded = true;
            this.listenTo(this.model, "msg:custom", this.handleCustomMessages);
        }
    },

    resetView: function() {
        this.setCam([1, -0.4, 0], [0, 0, 1]);
    },

    // may have to get axis orientation from data?
    setAxis: function (axis, dir) {
        let camPos = axis === 'X' ? [dir, 0, 0] : (axis === 'Y' ? [0, dir, 0] : [0, 0, dir] );
        let camViewUp = axis === 'Y' ? [0, 0, 1] : [0, 1, 0];
        this.setCam(camPos, camViewUp);
    },

    setCam: function(pos, vu) {
        let r = this.fsRenderer.getRenderer();
        let cam = r.get().activeCamera;
        cam.setPosition(pos[0], pos[1], pos[2]);
        cam.setFocalPoint(0, 0, 0);
        cam.setViewUp(vu[0], vu[1], vu[2]);
        r.resetCamera();
        cam.zoom(1.3);
        this.orientationMarker.updateMarkerOrientation();
        this.fsRenderer.getRenderWindow().render();
    },

    setBgColor: function() {
        this.fsRenderer.setBackground(vtk.Common.Core.vtkMath.hex2float(this.model.get('bg_color')));
        this.fsRenderer.getRenderWindow().render();
    },

    setTitle: function() {
        $(this.el).find('.viewer-title').text(this.model.get('title'));
    },

    toggleOrientationMarker: function () {
        this.orientationMarker.setEnabled(this.model.get('marker_visible'));
        this.fsRenderer.getRenderWindow().render();
    }

});

var ViewerModel = controls.VBoxModel.extend({

    defaults: _.extend(controls.VBoxModel.prototype.defaults(), {
        _model_name: 'ViewerModel',
        _view_name: 'ViewerView',
        _model_module: 'jupyter-rs-vtk-widget',
        _view_module: 'jupyter-rs-vtk-widget',
        _model_module_version: '0.0.1',
        _view_module_version: '0.0.1',
    }),
}, {});

var ViewerView = controls.VBoxView.extend({

    handleCustomMessages: function(msg) {
        if (msg.type === 'debug') {
            rsdbg(msg.msg);
        }
    },

    render: function() {
        // this is effectively "super.render()"
        controls.VBoxView.prototype.render.apply((this));
        this.listenTo(this.model, "msg:custom", this.handleCustomMessages);
    }
});

module.exports = {
    ViewerModel: ViewerModel,
    ViewerView: ViewerView,
    VTKModel: VTKModel,
    VTKView: VTKView
};
