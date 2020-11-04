Promise.all([
  d3.json("airports.json"),
  d3.json("world-110m.json", d3.autoType),
]).then((data) => {
  let airports = data[0];
  let worldmap = data[1];

  let airportNodes = airports.nodes;
  let airportLinks = airports.links;

  const features = topojson.feature(worldmap, worldmap.objects.countries)
    .features;

  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const projection = d3.geoMercator().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    topojson.feature(worldmap, worldmap.objects.countries)
  );

  const path = d3.geoPath().projection(projection);

  const svg = d3
    .select(".chart")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  let passengersList = [];
  for (x = 0; x < airportNodes.length; x++) {
    passengersList.push(airportNodes[x].passengers);
  }

  let force = d3
    .forceSimulation(airportNodes)
    .force("charge", d3.forceManyBody().strength(-30))
    .force("link", d3.forceLink(airportLinks).distance(40))
    .force(
      "center",
      d3
        .forceCenter()
        .x(width / 2)
        .y(height / 2)
    );

  function generateMap() {
    svg
      .selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", "green");

    svg
      .append("path")
      .datum(topojson.mesh(worldmap, worldmap.objects.countries))
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-linejoin", "round")
      .attr("d", path);
  }

  forceDiagram();

  d3.selectAll("input[name=display]").on("change", (event) => {
    option = event.target.value;

    transformViz();
  });

  function transformViz() {
    if (option === "map") {
      generateMap();
      let mapSize = d3
        .scaleLinear()
        .domain(d3.extent(passengersList))
        .range([3, 7]);

      let mapLinks = svg
        .selectAll(".chart")
        .data(data[0].links)
        .enter()
        .append("line")
        .attr("class", "map")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .attr("stroke", "red")
        .transition()
        .duration(1000)
        .attr("x1", function (d) {
          return projection([d.source.longitude, d.source.latitude])[0];
        })
        .attr("y1", function (d) {
          return projection([d.source.longitude, d.source.latitude])[1];
        })
        .attr("x2", function (d) {
          return projection([d.target.longitude, d.target.latitude])[0];
        })
        .attr("y2", function (d) {
          return projection([d.target.longitude, d.target.latitude])[1];
        });

      let nodes = svg
        .selectAll(".chart")
        .data(data[0].nodes)
        .enter()
        .append("circle")
        .attr("class", "map")
        .attr("cx", (d, i) => d.x)
        .attr("cy", (d, i) => d.y)
        .attr("fill", "orange")
        .attr("r", (d) => mapSize(d.passengers))
        .on("mouseenter", (event, d) => {
          const pos = d3.pointer(event, window);
          d3.selectAll(".tooltip")
            .style("display", "inline-block")
            .style("position", "fixed")
            .style("font-size", "20px")
            .style("color", "blue")
            .style("background-color", "lightgrey")

            .style("top", pos[1] + "px")
            .style("left", pos[0] + "px")
            .html(d.name);
        })
        .on("mouseleave", (event, d) => {
          d3.selectAll(".tooltip").style("display", "none");
        })
        .transition()
        .duration(1000)
        .attr("cx", function (d) {
          return projection([d.longitude, d.latitude])[0];
        })
        .attr("cy", function (d) {
          return projection([d.longitude, d.latitude])[1];
        });

      svg.selectAll("path").attr("opacity", 0);

      svg.selectAll(".force").remove();

      force.alpha(0.5).stop();

      force.on("tick", () => {
        mapLinks
          .attr("x1", function (d) {
            return projection([d.source.longitude, d.source.latitude])[0];
          })
          .attr("y1", function (d) {
            return projection([d.source.longitude, d.source.latitude])[1];
          })
          .attr("x2", function (d) {
            return projection([d.target.longitude, d.target.latitude])[0];
          })
          .attr("y2", function (d) {
            return projection([d.target.longitude, d.target.latitude])[1];
          });

        nodes.attr("transform", function (d) {
          return "translate(" + projection([d.longitude, d.latitude]) + ")";
        });
      });

      svg.selectAll("path").transition().delay(450).attr("opacity", 1);
    } else {
      forceDiagram();

      svg.selectAll("path").attr("opacity", 0);
    }
  }

  function forceDiagram() {
    svg.selectAll(".map").remove();

    let forceSize = d3
      .scaleLinear()
      .domain(d3.extent(passengersList))
      .range([4, 10]);

    let drag = (force) => {
      function dragstarted(event) {
        if (!event.active) force.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) force.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    force.alpha(0.5).restart();

    let link = svg
      .selectAll(".chart")
      .data(data[0].links)
      .enter()
      .append("line")
      .attr("class", "force")
      .attr("stroke", "red");

    let nodes = svg
      .selectAll(".node")
      .data(data[0].nodes)
      .enter()
      .append("circle")
      .attr("class", "force")
      .attr("cx", (d, i) => d.x)
      .attr("cy", (d, i) => d.y)
      .attr("r", (d) => forceSize(d.passengers))
      .attr("fill", "orange")
      .call(drag(force));

    force.on("tick", function () {
      nodes
        .attr("cx", function (d) {
          return d.x;
        })
        .attr("cy", function (d) {
          return d.y;
        });

      link
        .attr("x1", function (d) {
          return d.source.x;
        })
        .attr("y1", function (d) {
          return d.source.y;
        })
        .attr("x2", function (d) {
          return d.target.x;
        })
        .attr("y2", function (d) {
          return d.target.y;
        });
    });
  }
});
