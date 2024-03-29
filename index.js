var xmlrpc = require('xmlrpc');
var async = require('async');
var _ = require("underscore");

// Creates an XML-RPC client. Passes the host information on where to
// make the XML-RPC calls.
var client = xmlrpc.createClient({ host: 'localhost', port: 20738, path: '/RPC2'});

function cb(callback,error,value) {
    if (callback) { callback(error,value); }
}

function ubi(method,args,callback) {
    if (!args) { args = []; }
    client.methodCall('ubigraph.' + method, args, function (error, value) {
//        console.log('>> ' + method + ' ' + JSON.stringify(args) + ' : ',error,value);
                          if (callback) { callback(error,value); }
                      });
}


function vertexstyle(callback) {
ubi('new_vertex_style',[0],function(error,styleid) {
    async.series([
        function(cb) { ubi('set_vertex_style_attribute',[0,'size','1.0'],cb); },
        function(cb) { ubi('set_vertex_style_attribute',[0,'fontcolor','#809c21'],cb); },
        function(cb) { ubi('set_vertex_style_attribute',[0,'fontfamily','Fixed'],cb); },
        function(cb) { ubi('set_vertex_style_attribute',[0,'color','#405c71'],cb); }
    ], function(err,bla) {
        callback(null,true);
    });
});
}


function edgestyle(callback) {
ubi('new_edge_style',[0],function(error,edgeid) {
        edgeid = 0;
        ubi('set_edge_style_attribute',[edgeid,'color','#445544']);
//        ubi('set_edge_style_attribute',[edgeid,'spline','true']);
        ubi('set_edge_style_attribute',[edgeid,'arrow','true']);
        ubi('set_edge_style_attribute',[edgeid,'arrow_radius','0.4']);
        ubi('set_edge_style_attribute',[edgeid,'arrow_length','2.0']);
        ubi('set_edge_style_attribute',[edgeid,'strength','0.1']);
        ubi('set_edge_style_attribute',[edgeid,'fontfamily','Fixed'],function() { cb(callback,null,edgeid); });
    });    
}


function addvertex(label,callback) {
    console.log("adding vertex",label);
    ubi('new_vertex', undefined, function(err,vertexid) {
        ubi('change_vertex_style',[vertexid,0], function() {
            ubi('set_vertex_attribute',[vertexid,'label',label], function() { callback(null,vertexid) }); });
    });
}


function addedge(node1,node2,namef,callback) {
    console.log('connecting',namef(node1),'->',namef(node2));
    ubi('new_edge', [node2.vertexid, node1.vertexid],function(err,edgeid) {
        ubi('change_edge_style',[edgeid,0],callback);
    });
}



// adds vertexes for nodes
function addnodes(nodes,callback) {
    var nodefunctions = _.map(nodes, function(node) {
        return function(callback) { addvertex(node.name,function(err,id) { node.vertexid = id; callback(err,id); }); };
    });
    async.parallel(nodefunctions,callback);
}

function breadthf_addnodes(node,childrenf,namef,callback) {    
    if (!namef) { namef = function (node) { return node.name() } }
    if (!childrenf) { childrenf = function (node) { return node.getchildren() } }
    if (node.vertexid) { return callback() }

    addvertex(namef(node),function(err,id) {

        node.vertexid = id;

        var nodefunctions = _.map(childrenf(node), function(child) {
            return function(callback) { 
                breadthf_addnodes(child,childrenf,namef,function() {
                  addedge(node,child,namef,callback);
                });
            }
        });
        async.parallel(nodefunctions,callback);
    });
}


// requires only that each node has name property and parents() call
exports.visualize = function(node,childrenf,namef,callback) {
    console.log("visualize");

    async.series([

        // clear graph
        function(callback) { ubi('clear',undefined,callback); },

        // parallelly define vertex & edge styles
        function(callback) { async.parallel([vertexstyle,edgestyle], callback); },
        
        // add nodes
        function(callback) { breadthf_addnodes(node,childrenf,namef,callback) }
    ], callback );
}

