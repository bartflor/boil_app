import * as go from 'gojs';
import { produce } from 'immer';
import * as React from 'react';

import { DiagramWrapper } from './components/DiagramWrapper';
import { SelectionInspector } from './components/SelectionInspector';

import './App.css';
import Form from './components/Form';

interface AppState {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  selectedData: go.ObjectData | null;
  skipsDiagramUpdate: boolean;
}

class App extends React.Component<{}, AppState> {
  private mapNodeKeyIdx: Map<go.Key, number>;
  private mapLinkKeyIdx: Map<go.Key, number>;

  constructor(props: object) {
    super(props);
    this.state = {
      nodeDataArray: [],
      linkDataArray: [],
      modelData: { canRelink: true },
      selectedData: null,
      skipsDiagramUpdate: false,
    };

    this.mapNodeKeyIdx = new Map<go.Key, number>();
    this.mapLinkKeyIdx = new Map<go.Key, number>();

    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  private refreshNodeIndex(nodeArr: Array<go.ObjectData>) {
    this.mapNodeKeyIdx.clear();
    nodeArr.forEach((n: go.ObjectData, idx: number) => {
      this.mapNodeKeyIdx.set(n.key, idx);
    });
  }

  private refreshLinkIndex(linkArr: Array<go.ObjectData>) {
    this.mapLinkKeyIdx.clear();
    linkArr.forEach((l: go.ObjectData, idx: number) => {
      this.mapLinkKeyIdx.set(l.key, idx);
    });
  }

  public handleDiagramEvent(e: go.DiagramEvent) {
    const name = e.name;
    switch (name) {
      case 'ChangedSelection': {
        const sel = e.subject.first();
        this.setState(
          produce((draft: AppState) => {
            if (sel) {
              if (sel instanceof go.Node) {
                const idx = this.mapNodeKeyIdx.get(sel.key);
                if (idx !== undefined && idx >= 0) {
                  const nd = draft.nodeDataArray[idx];
                  draft.selectedData = nd;
                }
              } else if (sel instanceof go.Link) {
                const idx = this.mapLinkKeyIdx.get(sel.key);
                if (idx !== undefined && idx >= 0) {
                  const ld = draft.linkDataArray[idx];
                  draft.selectedData = ld;
                }
              }
            } else {
              draft.selectedData = null;
            }
          })
        );
        break;
      }
      default:
        break;
    }
  }

  public handleModelChange(obj: go.IncrementalData) {
    const insertedNodeKeys = obj.insertedNodeKeys;
    const modifiedNodeData = obj.modifiedNodeData;
    const removedNodeKeys = obj.removedNodeKeys;
    const insertedLinkKeys = obj.insertedLinkKeys;
    const modifiedLinkData = obj.modifiedLinkData;
    const removedLinkKeys = obj.removedLinkKeys;
    const modifiedModelData = obj.modelData;

    // maintain maps of modified data so insertions don't need slow lookups
    const modifiedNodeMap = new Map<go.Key, go.ObjectData>();
    const modifiedLinkMap = new Map<go.Key, go.ObjectData>();
    this.setState(
      produce((draft: AppState) => {
        let narr = draft.nodeDataArray;
        if (modifiedNodeData) {
          modifiedNodeData.forEach((nd: go.ObjectData) => {
            modifiedNodeMap.set(nd.key, nd);
            const idx = this.mapNodeKeyIdx.get(nd.key);
            if (idx !== undefined && idx >= 0) {
              narr[idx] = nd;
              if (draft.selectedData && draft.selectedData.key === nd.key) {
                draft.selectedData = nd;
              }
            }
          });
        }
        if (insertedNodeKeys) {
          insertedNodeKeys.forEach((key: go.Key) => {
            const nd = modifiedNodeMap.get(key);
            const idx = this.mapNodeKeyIdx.get(key);
            if (nd && idx === undefined) {  // nodes won't be added if they already exist
              this.mapNodeKeyIdx.set(nd.key, narr.length);
              narr.push(nd);
            }
          });
        }
        if (removedNodeKeys) {
          narr = narr.filter((nd: go.ObjectData) => {
            if (removedNodeKeys.includes(nd.key)) {
              return false;
            }
            return true;
          });
          draft.nodeDataArray = narr;
          this.refreshNodeIndex(narr);
        }

        let larr = draft.linkDataArray;
        if (modifiedLinkData) {
          modifiedLinkData.forEach((ld: go.ObjectData) => {
            modifiedLinkMap.set(ld.key, ld);
            const idx = this.mapLinkKeyIdx.get(ld.key);
            if (idx !== undefined && idx >= 0) {
              larr[idx] = ld;
              if (draft.selectedData && draft.selectedData.key === ld.key) {
                draft.selectedData = ld;
              }
            }
          });
        }
        if (insertedLinkKeys) {
          insertedLinkKeys.forEach((key: go.Key) => {
            const ld = modifiedLinkMap.get(key);
            const idx = this.mapLinkKeyIdx.get(key);
            if (ld && idx === undefined) {  // links won't be added if they already exist
              this.mapLinkKeyIdx.set(ld.key, larr.length);
              larr.push(ld);
            }
          });
        }
        if (removedLinkKeys) {
          larr = larr.filter((ld: go.ObjectData) => {
            if (removedLinkKeys.includes(ld.key)) {
              return false;
            }
            return true;
          });
          draft.linkDataArray = larr;
          this.refreshLinkIndex(larr);
        }
        // handle model data changes, for now just replacing with the supplied object
        if (modifiedModelData) {
          draft.modelData = modifiedModelData;
        }
        draft.skipsDiagramUpdate = true;  // the GoJS model already knows about these updates
      })
    );
  }

  /**
   * Handle inspector changes, and on input field blurs, update node/link data state.
   * @param path the path to the property being modified
   * @param value the new value of that property
   * @param isBlur whether the input event was a blur, indicating the edit is complete
   */
  public handleInputChange(path: string, value: string, isBlur: boolean) {
    this.setState(
      produce((draft: AppState) => {
        const data = draft.selectedData as go.ObjectData;  // only reached if selectedData isn't null
        data[path] = value;
        if (isBlur) {
          const key = data.key;
          if (key < 0) {  // negative keys are links
            const idx = this.mapLinkKeyIdx.get(key);
            if (idx !== undefined && idx >= 0) {
              draft.linkDataArray[idx] = data;
              draft.skipsDiagramUpdate = false;
            }
          } else {
            const idx = this.mapNodeKeyIdx.get(key);
            if (idx !== undefined && idx >= 0) {
              draft.nodeDataArray[idx] = data;
              draft.skipsDiagramUpdate = false;
            }
          }
        }
      })
    );
  }

  /**
   * Handle changes to the checkbox on whether to allow relinking.
   * @param e a change event from the checkbox
   */
  public handleRelinkChange(e: any) {
    const target = e.target;
    const value = target.checked;
    this.setState({ modelData: { canRelink: value }, skipsDiagramUpdate: false });
  }

  // private calculateEarlyStart(nodeDataArray: Array<go.ObjectData>, linkDataArray: Array<go.ObjectData>) {
  //   const keyToNodeMap = new Map<number, go.ObjectData>();
  //   const keyToLinksMap = new Map<number, Array<number>>();

  //   // Stwórz mapę dla eventów
  //   nodeDataArray.forEach((node) => {
  //     keyToNodeMap.set(node.key, node);
  //   });

  //   // Stwórz mapę dla linków
  //   linkDataArray.forEach((link) => {
  //     const links = keyToLinksMap.get(link.to) || [];
  //     links.push(link.from);
  //     keyToLinksMap.set(link.to, links);
  //   });

  //   // Funkcja rekurencyjna do obliczenia wartości 'earlyStart'
  //   const calculateEarlyStartRecursive = (key: number): number => {
  //     const links = keyToLinksMap.get(key);
  //     if (!links || links.length === 0) {
  //       // Brak poprzedzających zdarzeń, więc 'earlyStart' jest równe 0
  //       return 0;
  //     }

  //     let maxEarlyStart = 0;
  //     for (const link of links) {
  //       const earlyStart =  parseFloat(calculateEarlyStartRecursive(link)) + parseFloat(keyToNodeMap.get(link).length);
  //       if (earlyStart > maxEarlyStart) {
  //         maxEarlyStart = earlyStart;
  //       }
  //     }

  //     return maxEarlyStart;
  //   };

  //   // Ustaw wartości 'earlyStart' dla każdego eventu
  //   nodeDataArray.forEach((node) => {
  //     const earlyStart = calculateEarlyStartRecursive(node.key);
  //     node.earlyStart = earlyStart;
  //   });
  // }

  private calculateEarlyStart(nodeDataArray: Array<go.ObjectData>, linkDataArray: Array<go.ObjectData>) {
    const keyToNodeMap = new Map<number, go.ObjectData>();
    const keyToLinksMap = new Map<number, Array<number>>();

    // Stwórz mapę dla eventów
    nodeDataArray.forEach((node) => {
      keyToNodeMap.set(node.key, node);
    });

    // Stwórz mapę dla linków
    linkDataArray.forEach((link) => {
      const links = keyToLinksMap.get(link.to) || [];
      links.push(link.from);
      keyToLinksMap.set(link.to, links);
    });

    // Funkcja rekurencyjna do obliczania wartości 'earlyStart' i 'lateFinish'
    const calculateEarlyStartRecursive = (key: number): number => {
      const links = keyToLinksMap.get(key);
      if (!links || links.length === 0) {
        // Brak poprzedzających zdarzeń, więc 'earlyStart' i 'lateFinish' są równe 0
        return 0;
      }

      let maxEarlyStart = 0;

      for (const link of links) {
        const precedingEvent = keyToNodeMap.get(link);
        const earlyStart = calculateEarlyStartRecursive(link) + precedingEvent.length;
        if (earlyStart > maxEarlyStart) {
          maxEarlyStart = earlyStart;
        }
      }

      return maxEarlyStart;
    };

    nodeDataArray.forEach((node) => {
      node.earlyStart = calculateEarlyStartRecursive(node.key);

      // Oblicz wartości 'lateFinish' dla ostatniego eventu
      const links = linkDataArray.filter((link) => link.from === node.key);
      if (!links || links.length === 0) {
        // Brak następujących zdarzeń, więc 'lateFinish' jest równe 'earlyStart' + 'length'
        node.lateFinish = node.earlyStart + node.length;
      }
    })

    // Oblicz wartości 'earlyStart' dla każdego eventu
    nodeDataArray.forEach((node) => {
      node.earlyStart = calculateEarlyStartRecursive(node.key);

      // Oblicz wartości 'lateFinish' dla każdego eventu
      const links = linkDataArray.filter((link) => link.from === node.key);
      if (!links || links.length === 0) {
        // Brak następujących zdarzeń, więc 'lateFinish' jest równe 'earlyStart' + 'length'
        node.lateFinish = node.earlyStart + node.length;
      } else {
        // Oblicz 'lateFinish' jako najmniejszą wartość dla wszystkich następujących zdarzeń
        node.lateFinish = Math.min(
          ...links.map((link) => {
            const succeedingEvent = keyToNodeMap.get(link.to);
            return succeedingEvent.lateFinish - succeedingEvent.length;
          })
        );
      }
    });
  }

  public handleFormSubmit(formData: { numEvents: number; events: Array<{ eventName: string; length: string; precedingEvents: Array<number> }> }) {
    this.setState(
      produce((draft: AppState) => {
        // Usuń poprzednie dane
        draft.nodeDataArray = [];
        draft.linkDataArray = [];

        // Dodaj dane z formularza do nodeDataArray
        formData.events.forEach((event, index) => {
          const lengthAsNumber = parseFloat(event.length); // Konwertuj długość na liczbę
          if (isNaN(lengthAsNumber)) {
            // Obsługa błędu, jeśli wartość 'length' nie jest liczbą
            console.error(`Błąd w danych wejściowych: Wartość 'length' dla eventu ${index + 1} nie jest liczbą.`);
            return;
          }

          const newNode = {
            key: draft.nodeDataArray.length + 1, // Nowe ID na podstawie aktualnej długości tablicy
            text: event.eventName,
            length: lengthAsNumber,
            earlyStart: 0,
            lateFinish: 0,
            critical: false,
          };
          draft.nodeDataArray.push(newNode);

          // Dodaj linki na podstawie poprzedzających eventów
          event.precedingEvents.forEach((precedingEvent) => {
            const newLink = {
              from: precedingEvent,
              to: newNode.key,
            };
            draft.linkDataArray.push(newLink);
          });
        });

        // Oblicz wartości 'earlyStart' i 'lateFinish'
        this.calculateEarlyStart(draft.nodeDataArray, draft.linkDataArray);
      })
    );
  }

  public handleResetData() {
    this.setState({
      nodeDataArray: [],
      linkDataArray: [],
    });
  }

  public render() {
    const selectedData = this.state.selectedData;
    let inspector;
    if (selectedData !== null) {
      inspector = <SelectionInspector selectedData={this.state.selectedData} onInputChange={this.handleInputChange} />;
    }

    return (
      <div>
        <Form onFormSubmit={this.handleFormSubmit} onResetData={this.handleResetData} />

        <DiagramWrapper
          nodeDataArray={this.state.nodeDataArray}
          linkDataArray={this.state.linkDataArray}
          modelData={this.state.modelData}
          skipsDiagramUpdate={this.state.skipsDiagramUpdate}
          onDiagramEvent={this.handleDiagramEvent}
          onModelChange={this.handleModelChange}
        />
        {inspector}
      </div>
    );
  }
}

export default App;