<%
    galaxy_root = h.url_for( "/" )
    static_url  = galaxy_root + "plugins/visualizations/popularity/static"
    title       = "Tool popularity derived from dataset '" + hda.name + "'"
    creating_job = trans.security.encode_id( hda.creating_job.id )
    creating_job_id = hda.creating_job.id
    tool2 = hda.creating_job.tool_id
    if hasattr(hda.datatype, 'file_ext'):
        file_ext = hda.datatype.file_ext
    else:
        file_ext = None
%>
<!DOCTYPE HTML>
<html>
<head>
    <title>${ title }</title>
    ${h.css( 'base' )}
    ${h.stylesheet_link( static_url + "/tablesorter/style.css" )}

    ${h.js( 'libs/jquery/jquery',
            'libs/underscore',
            'libs/backbone',
            'libs/require'
    )}

    ${h.javascript_link( static_url + "/triplets.json" )}
    ${h.javascript_link( static_url + "/datatype_filter.json" )}
    ${h.javascript_link( static_url + "/datatype_tools.json" )}
    ${h.javascript_link( static_url + "/tablesorter/jquery.tablesorter.min.js" )}
</head>

<body>
    <div class="chart-header">
        <h2>${title}</h2>
    </div>
    <div id="tools-container">
        Please wait.
    </div>

    <script type="text/javascript">
        // Argument 'triplet_data' is loaded from plugin data folder and is
        // generated from mining tool triplet appearances in galaxy database.
        // Argument 'filters' is loaded from plugin data folder and is generated
        // by examining tool forms for acceptable input datatypes.
        require(['${static_url}/popularity.js'], function( Popularity ){
            var attributes = {
                'triplet_data': triplet_data,
                'datatype_filter': filters,
                'datatype_tools': datatype_tools,
                'job2_id': "${creating_job}",
                'tool2_name': "${tool2}",
                'hda_datatype': "${file_ext}"
            };
            window.view = new Popularity(attributes);
        });
    </script>
</body>
