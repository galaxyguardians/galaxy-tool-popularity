define([], function(){
    //['libs/jquery/jquery', 'libs/underscore', 'libs/backbone'], function($, _, Backbone){

    /**
    * Popularity model extended
    **/
    var PopularityModel = Backbone.Model.extend({
        initialize: function(){
            this.set('tool1s', []);
            this.set('expected_tools', 0);
            this.set('popularity', {});
            this.listenTo(this, 'tool1s_updated', this.check_tool1_completion, this);
            this.getToolList();
        },

        /**
         * Get a list of popular tools that based on the inputs to the selected dataset.
         */
        getToolList: function(){
            var self = this,
                tool1s = this.get('tool1s'),
                job2Info = $.ajax( '/api/jobs/' + this.get('job2_id') );
            job2Info.done( function( response ) {
                var job2Inputs = response.inputs;
                self.set('expected_tools', Object.keys(job2Inputs).length);
                if ($.isEmptyObject(job2Inputs)){
                    self.set({'error_message': "Error retrieving job history for this dataset, which is necessary for tool predictions."});
                    self.trigger('data_error');
                } else {
                    // Look for ID(s) of job(s) preceeding this dataset's job
                    _.each(job2Inputs, function( v ) {
                        $.ajax( '/api/datasets/' + v.id )
                            .done( function(response){
                                $.ajax( '/api/jobs/' + response.creating_job )
                                    .done( function(response){
                                        tool1s.push( response.tool_id );
                                        self.trigger('tool1s_updated');
                                });
                        });
                    });
                }
            });
        },

        check_tool1_completion: function(){
            if ( this.get('tool1s').length === this.get('expected_tools') &&
                 this.get('tool1s').length > 0 ){
                this.filter_tool1s();
                this.calculate_popularity();
                this.set('expected_tools', 0);
                this.set('tool1s', []);
            }
        },

        filter_tool1s: function(){
            var ignoreTools = [ 'upload1', '__SET_METADATA__' ],
                initialTools = this.get('tool1s'),
                filteredTools = [];
            // Wait for all the requests to return and filter tool IDs
            _.each( initialTools, function(tool){
                if( ignoreTools.indexOf( tool ) === -1 ){
                    filteredTools.push(tool);
                }
            });
            this.set('tool1s', filteredTools);
        },

        calculate_popularity: function(){
            var tool2_id = this.get('triplet_data').tool_names.indexOf(this.get('tool2_name')),
                self = this,
                popularity = this.get('popularity'),
                tool1_id, key;
            _.each(this.get('tool1s'), function(tool){
                tool1_id = self.get('triplet_data').tool_names.indexOf(tool);
                key = tool2_id + ',' + tool1_id;
                _.each(self.get('triplet_data').triplets[key], function(freq, tool3){
                    if( tool3 in popularity ){
                        popularity[tool3] += freq;
                    } else {
                        popularity[tool3] = freq;
                    }
                });
            });
            this.filter_by_datatype();
        },

        filter_by_datatype: function(){
            var self = this;
            var popularity = this.get('popularity');
            self.triplet_data = this.get('triplet_data'); // Triplet data
            self.datatype_tools = this.get('datatype_tools'); // Datatype to tools map
            // Remove tools whose input datatype is not compatible with the current
            // dataset datatype
            Object.keys(popularity).forEach(function(tool3_index){
                var tool3_name = self.triplet_data.tool_names[tool3_index];
                if (($.inArray(tool3_name, self.datatype_tools[self.get('hda_datatype')])) === -1){
                    delete(popularity[tool3_index]);
                }
            });

            // Rescale popularity frequencies
            self.total = 0;
            Object.keys(popularity).forEach(function(key){
                self.total += popularity[key];
            });
            Object.keys(popularity).forEach(function(key){
                popularity[key] = popularity[key]/self.total;
            });
            self.trigger('popularity_calculated');
        },
    });

    var Popularity = Backbone.View.extend({
        table_tpl: _.template("<table id='pop_table' class='tablesorter'>" +
                              "<thead><tr><th>Popularity</th><th>Tool name</th></tr></thead><tbody>" +
                              "<%= rows %></tbody></table>"),
        row_tpl: _.template("<tr><td width='90px'><%- popularity %>%</td><td><%- tool_name %></tr>"),
        el: '#tools-container',
        initialize: function (attributes) {
            this.render();
            this.model = new PopularityModel(_.extend(attributes, {'view':this}));
            this.listenTo(this.model, 'popularity_calculated', this.renderPopularity);
            this.listenTo(this.model, 'data_error', this.renderError);
        },
        render: function(){
            this.$el.html("Please wait - computing tool popularity.");
        },
        renderPopularity: function(){
            var self = this,
                rows = "";
            _.each(this.model.get('popularity'), function(v, k){
                rows += self.row_tpl({'popularity': (v*100).toFixed(2), 'tool_name': self.model.get('triplet_data').tool_names[k]});
            });
            self.$el.html(self.table_tpl({'rows': rows}));
            $(function(){
                // sort on the first column, order descending
                $('.tablesorter').tablesorter({sortList: [[0,1]]});
            });
        },
        renderError: function(){
            var self = this;
            var msg = self.model.get('error_message');
            self.$el.html("<div class='error'>" + msg + "</div>");
        }
    });
    return Popularity;
});
