/*
*  Copyright (C) 1998-2023 by Northwoods Software Corporation. All Rights Reserved.
*/

import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';
import * as React from 'react';

import { GuidedDraggingTool } from '../GuidedDraggingTool';

import './Diagram.css';

interface DiagramProps {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  skipsDiagramUpdate: boolean;
  onDiagramEvent: (e: go.DiagramEvent) => void;
  onModelChange: (e: go.IncrementalData) => void;
}

export class DiagramWrapper extends React.Component<DiagramProps, {}> {
  /**
   * Ref to keep a reference to the Diagram component, which provides access to the GoJS diagram via getDiagram().
   */
  private diagramRef: React.RefObject<ReactDiagram>;

  private diagramStyle = { backgroundColor: '#eee' };
  

  /** @internal */
  constructor(props: DiagramProps) {
    super(props);
    this.diagramRef = React.createRef();
  }

  /**
   * Get the diagram reference and add any desired diagram listeners.
   * Typically the same function will be used for each listener, with the function using a switch statement to handle the events.
   */
  public componentDidMount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener('ChangedSelection', this.props.onDiagramEvent);
    }
  }

  /**
   * Get the diagram reference and remove listeners that were added during mounting.
   */
  public componentWillUnmount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.removeDiagramListener('ChangedSelection', this.props.onDiagramEvent);
    }
  }

  /**
   * Diagram initialization method, which is passed to the ReactDiagram component.
   * This method is responsible for making the diagram and initializing the model, any templates,
   * and maybe doing other initialization tasks like customizing tools.
   * The model's data should not be set here, as the ReactDiagram component handles that.
   */
  private initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;
    // set your license key here before creating the diagram: go.Diagram.licenseKey = "...";
    const diagram =
    $(go.Diagram,
    {
      // initialAutoScale: go.Diagram.Uniform,
      layout: $(go.LayeredDigraphLayout, { alignOption: go.LayeredDigraphLayout.AlignAll }),

      model: $(go.GraphLinksModel,
        {
          linkKeyProperty: 'key',  // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
          // positive keys for nodes
          makeUniqueKeyFunction: (m: go.Model, data: any) => {
            let k = data.key || 1;
            while (m.findNodeDataForKey(k)) k++;
            data.key = k;
            return k;
          },
          // negative keys for links
          makeUniqueLinkKeyFunction: (m: go.GraphLinksModel, data: any) => {
            let k = data.key || -1;
            while (m.findLinkDataForKey(k)) k--;
            data.key = k;
            return k;
          }
        })
    });


    // define a simple Node template
    diagram.nodeTemplate =
    $(go.Node, "Auto",
    $(go.Shape, "Rectangle",  // the border
      { fill: "white", strokeWidth: 2 },
      new go.Binding("fill", "critical", b => b ? pinkfill : bluefill),
      new go.Binding("stroke", "critical", b => b ? pink : blue)),
    $(go.Panel, "Table",
      { padding: 0.5 },
      $(go.RowColumnDefinition, { column: 1, separatorStroke: "black" }),
      $(go.RowColumnDefinition, { column: 2, separatorStroke: "black" }),
      $(go.RowColumnDefinition, { row: 1, separatorStroke: "black", background: "white", coversSeparators: true }),
      $(go.RowColumnDefinition, { row: 2, separatorStroke: "black" }),
      $(go.TextBlock, // earlyStart
        new go.Binding("text", "earlyStart"),
        { row: 0, column: 0, margin: 5, textAlign: "center" }),
      $(go.TextBlock,
        new go.Binding("text", "length"),
        { row: 0, column: 1, margin: 5, textAlign: "center" }),
      $(go.TextBlock,  // earlyFinish
        new go.Binding("text", "",
          d => (d.earlyStart + d.length).toFixed(2)),
        { row: 0, column: 2, margin: 5, textAlign: "center" }),

      $(go.TextBlock,
        new go.Binding("text", "text"),
        {
          row: 1, column: 0, columnSpan: 3, margin: 5,
          textAlign: "center", font: "bold 14px sans-serif"
        }),

      $(go.TextBlock,  // lateStart
        new go.Binding("text", "",
          d => (d.lateFinish - d.length).toFixed(2)),
        { row: 2, column: 0, margin: 5, textAlign: "center" }),
      $(go.TextBlock,  // slack
        new go.Binding("text", "",
          d => (d.lateFinish - (d.earlyStart + d.length)).toFixed(2)),
        { row: 2, column: 1, margin: 5, textAlign: "center" }),
      $(go.TextBlock, // lateFinish
        new go.Binding("text", "lateFinish"),
        { row: 2, column: 2, margin: 5, textAlign: "center" })
    )  // end Table Panel
  );  // end Node

  var blue = "#0288D1";
  var pink = "#B71C1C";
  var pinkfill = "#F8BBD0";
  var bluefill = "#B3E5FC";

  function linkColorConverter(elt: any) {
    var link = elt.part;
    if (!link) return blue;
    var f = link.fromNode;
    if (!f || !f.data || !f.data.critical) return blue;
    var t = link.toNode;
    if (!t || !t.data || !t.data.critical) return blue;
    return pink;  // when both Link.fromNode.data.critical and Link.toNode.data.critical
  }

    // relinking depends on modelData
    diagram.linkTemplate =
    $(go.Link,
      { toShortLength: 6, toEndSegmentLength: 20 },
      $(go.Shape,
        { strokeWidth: 4 },
        new go.Binding("stroke", "", linkColorConverter)),
      $(go.Shape,  // arrowhead
        { toArrow: "Triangle", stroke: null, scale: 1.5 },
        new go.Binding("fill", "", linkColorConverter))
    );

    diagram.add(
      $(go.Node, "Auto",
        $(go.Shape, "Rectangle",  // the border
          { fill: "#EEEEEE" }),
        $(go.Panel, "Table",
          $(go.RowColumnDefinition, { column: 1, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { column: 2, separatorStroke: "black" }),
          $(go.RowColumnDefinition, { row: 1, separatorStroke: "black", background: "#EEEEEE", coversSeparators: true }),
          $(go.RowColumnDefinition, { row: 2, separatorStroke: "black" }),
          $(go.TextBlock, "Early Start",
            { row: 0, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Length",
            { row: 0, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Early Finish",
            { row: 0, column: 2, margin: 5, textAlign: "center" }),

          $(go.TextBlock, "Activity Name",
            {
              row: 1, column: 0, columnSpan: 3, margin: 5,
              textAlign: "center", font: "bold 14px sans-serif"
            }),

          $(go.TextBlock, "Late Start",
            { row: 2, column: 0, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Slack",
            { row: 2, column: 1, margin: 5, textAlign: "center" }),
          $(go.TextBlock, "Late Finish",
            { row: 2, column: 2, margin: 5, textAlign: "center" })
        )  // end Table Panel
      ));

    return diagram;
  }

  public render() {
    return (
      <ReactDiagram
        ref={this.diagramRef}
        divClassName='diagram-component'
        style={this.diagramStyle}
        initDiagram={this.initDiagram}
        nodeDataArray={this.props.nodeDataArray}
        linkDataArray={this.props.linkDataArray}
        modelData={this.props.modelData}
        onModelChange={this.props.onModelChange}
        skipsDiagramUpdate={this.props.skipsDiagramUpdate}
      />
    );
  }
}
