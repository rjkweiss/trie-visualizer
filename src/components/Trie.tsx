import { useEffect, useState } from "react";
import { Trie, TrieNode } from "../trie/Trie";
import './Trie.css';


type TrieNodeData = {
    id: string;  // unique identifier like root -> a -> p -> p
    char: string;  // the characters e.g. 'a', 'p'
    x: number;    // the x position
    y: number;    // the y position
    isEndOfWord: boolean;  // to render differently for active paths
    children: string[];   // IDs of child nodes
}

export const TrieVisualizer = () => {

    // state
    const [trie] = useState(() => new Trie());
    const [inputWord, setInputWord] = useState<string>("");
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [_countNodes, setCountNodes] = useState<number>(0); // we use this to trigger re - renders

    const [animatingPath, setAnimatingPath] = useState<string[]>([]); // node IDs being animated
    const [activePath, setActivePath] = useState<string[]>([]);       // green path
    const [_animationType, setAnimationType] = useState<'insert' | 'search' | 'delete' | null>(null);

    const [completeWords, setCompleteWords] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (activePath.length > 0) {
            const timer = setTimeout(() => {
                setActivePath([]);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [activePath]);

    // trie operations to traverse and animate visualizer
    const traverseTrie = (): TrieNodeData[] => {

        const nodes: TrieNodeData[] = [];
        const VERTICAL_SPACING = 80;

        // helper function to recursively traverse
        const traverse = (node: TrieNode, char: string, path: string, depth: number) => {
            // create unique id
            const nodeId = path;

            // store current index of where we are adding this node
            const currIndex = nodes.length;

            // add node tonodes array
            nodes.push({
                id: nodeId,
                char: char,
                x: 0,
                y: depth * VERTICAL_SPACING,
                isEndOfWord: node.isEndOfWord,
                children: []
            });

            // recursively traverse each child
            for (const [childChar, childNode] of node.children) {
                // build child path: current path, dash, child char
                const childPath: string = path + '-' + childChar;
                traverse(childNode, childChar, childPath, depth + 1);

                // Access the current node correctly
                nodes[currIndex].children.push(childPath)
            }
        }

        traverse(trie.getRoot(), 'root', 'root', 0);
        return nodes;
    };

    const calculatePositions = (nodes: TrieNodeData[]): TrieNodeData[] => {
        const VERTICAL_SPACING = 80;
        const HORIZONTAL_SPACING = 60;

        // Create a map for quick lookup
        const nodeMap = new Map<string, TrieNodeData>();
        nodes.forEach(node => nodeMap.set(node.id, node));

        // Calculate width needed for each subtree
        const calculateWidth = (nodeId: string): number => {
            const node = nodeMap.get(nodeId);
            if (!node || node.children.length === 0) return 1;

            // width is sum of all children's widths
            return node.children.reduce((sum, childId) => {
                return sum + calculateWidth(childId);
            }, 0);
        };

        // Position nodes recursively
        const positionNode = (nodeId: string, x: number, depth: number): number => {
            const node = nodeMap.get(nodeId);
            if (!node) return x;

            node.y = depth * VERTICAL_SPACING + 50;

            if (node.children.length === 0) {
                node.x = x;
                return x + HORIZONTAL_SPACING;
            }

            // Position all children first
            let childX = x;
            const childPositions: number[] = [];
            node.children.forEach(childId => {
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    childX = positionNode(childId, childX, depth + 1);
                    childPositions.push(childNode.x);
                }
            });

            // position parent at center of children
            if (childPositions.length > 0) {
                node.x = (childPositions[0] + childPositions[childPositions.length - 1]) / 2;
            }

            return childX;
        };

        // Start positioning from root
        positionNode('root', 0, 0);
        // Calculate the total width of the tree
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x));
        const treeWidth = maxX - minX;

        // Center the tree by offsetting all x positions
        const centerOffset = -treeWidth / 2;
        nodes.forEach(node => {
            node.x += centerOffset;
        });

        return nodes;
    };

    // event handlers
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInsert();
        }
    };

    const handleInsert = (): void => {
        if (!inputWord.trim()) {
            setFeedbackMessage("Please enter a word to insert");
            return;
        }

        const trimmedInput = inputWord.trim().toLowerCase();

        if (completeWords.has(trimmedInput)) {
            setFeedbackMessage(`"${trimmedInput}" already exists in the Trie!`);
            setInputWord("");
            return;
        }

        const path = buildPathForward(trimmedInput);

        setActivePath([]);

        setTimeout(() => {
            // Animate insertion step by step
            setAnimationType('insert');
            setAnimatingPath([]);

            // trie.insert(trimmedInput);

            path.forEach((nodeId, index) => {
                setTimeout(() => {
                    setAnimatingPath([nodeId]);

                    // Actually insert up to this character
                    if (index > 0) {
                        const partialWord = trimmedInput.substring(0, index);
                        trie.insert(partialWord);
                        setCountNodes(prev => prev + 1);
                    }

                    //  build active path
                    setActivePath(path.slice(0, index + 1));

                    // on last Character, complete the insertion
                    if (index === path.length - 1) {
                        trie.insert(trimmedInput);

                        // Mark this as a REAL complete word
                        setCompleteWords(prev => new Set(prev).add(trimmedInput));

                        setTimeout(() => {
                            setAnimatingPath([]);
                            setActivePath(path);
                            // setCountNodes(prev => prev + 1);
                            setFeedbackMessage(`${trimmedInput} has been inserted into the Trie!`);
                        }, 500);
                    }
                }, index * 500);
            });
        }, 100);

        setInputWord("");
    };

    const handleSearch = (type: 'word' | 'prefix') => {
        // handle empty input
        if (!inputWord.trim()) {
            setFeedbackMessage('Please enter a word to search');
            return;
        }

        const trimmedInput = inputWord.trim().toLowerCase();

        // clear previous animations
        setActivePath([]);

        setTimeout(() => {
            setAnimationType('search');
            setAnimatingPath([]);

            const path = buildPathForward(trimmedInput);

            path.forEach((nodeId, index) => {
                setTimeout(() => {
                    setAnimatingPath([nodeId]);
                    //  on last character, show result
                    if (index === path.length - 1) {
                        setTimeout(() => {
                            setAnimatingPath([]);

                            let foundWord = false;

                            if (type === 'word') {
                                foundWord = trie.searchWord(trimmedInput);
                                if (foundWord) {
                                    setActivePath(path);
                                }

                                setFeedbackMessage(
                                    foundWord
                                        ? `"${trimmedInput}" found in the Trie`
                                        : `"${trimmedInput}" not found in the Trie`
                                );
                            } else {
                                foundWord = trie.startsWith(trimmedInput);
                                if (foundWord) {
                                    setActivePath(path);
                                }

                                setFeedbackMessage(
                                    foundWord
                                        ? `"${trimmedInput}" is a prefix in the Trie`
                                        : `"${trimmedInput}" not a prefix in the Trie`
                                );
                            }
                        }, 500);
                    }
                }, index * 300);
            })
        }, 100);


        setInputWord("");
    };

    const handleDelete = () => {
        // handle empty input
        if (!inputWord.trim()) {
            setFeedbackMessage('Please enter a word to delete from Trie');
            return;
        }

        const trimmedInput = inputWord.trim().toLowerCase();

        // Check if it's actually a complete word we inserted
        if (!completeWords.has(trimmedInput)) {
            setFeedbackMessage(`"${trimmedInput}" is not a complete word in the Trie!`);
            setInputWord("");
            return;
        }

        const path = buildPathForward(trimmedInput);

        // clear previous animations
        setActivePath([]);

        setTimeout(() => {
            setAnimationType('delete');
            setAnimatingPath([]);

            path.forEach((nodeId, index) => {
                setTimeout(() => {
                    setAnimatingPath([nodeId]);


                    // on last character, perform deletion
                    if (index === path.length - 1) {
                        setTimeout(() => {
                            // determine which nodes will actually be deleted
                            const nodesToDelete: string[] = [];

                            // setAnimatingPath([]);


                            // delete all partial words first
                            for (let i = trimmedInput.length; i >= 1; i--) {
                                const partial = trimmedInput.substring(0, i);

                                // check if this partial is needed by other words
                                let isNeededPrefix = false;
                                for (const word of completeWords) {
                                    if (word !== trimmedInput && word.startsWith(partial)) {
                                        isNeededPrefix = true;
                                        break;
                                    }
                                }


                                if (!isNeededPrefix) {
                                    const nodeId = 'root-' + partial.split('').join('-');
                                    nodesToDelete.push(nodeId);
                                    // trie.delete(partial);
                                } else {
                                    break;
                                }
                            }

                            // Animate deletion from bottom to top (reverse order)
                            nodesToDelete.forEach((nodeId, deleteIndex) => {
                                setTimeout(() => {
                                    setAnimatingPath([nodeId]);

                                    // After showing red, actually delete
                                    setTimeout(() => {
                                        const charCount = (nodeId.match(/-/g) || []).length;
                                        const partial = trimmedInput.substring(0, charCount);
                                        trie.delete(partial);

                                        setCountNodes(prev => prev - 1);

                                        // On last deletion
                                        if (deleteIndex === nodesToDelete.length - 1) {
                                            setAnimatingPath([]);

                                            // remove from completeWords
                                            setCompleteWords(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(trimmedInput);
                                                return newSet;
                                            });

                                            setFeedbackMessage(`"${trimmedInput}" successfully deleted from the Trie!`);
                                        }
                                    }, 300);
                                }, deleteIndex * 400);
                            });
                        }, 500);
                    }
                }, index * 300);
            });
        }, 100);

        setInputWord("");
    };

    const buildPathForward = (word: string): string[] => {
        const path: string[] = ['root'];
        let currentPath = 'root';

        for (const char of word.toLowerCase()) {
            currentPath = currentPath + '-' + char;
            path.push(currentPath);
        }

        return path;
    };

    const renderTrie = () => {
        let nodes = calculatePositions(traverseTrie());

        if (nodes.length === 0) return null;

        // calculate bounding box
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x));
        const minY = Math.min(...nodes.map(n => n.y));
        const maxY = Math.max(...nodes.map(n => n.y));

        const width = maxX - minX + 100; // +100 for padding
        const height = maxY - minY + 100;

        // SVG dimensions
        const svgWidth = Math.max(width, 800);
        const svgHeight = Math.max(height, 600);

        // center offset

        // Center offset
        const offsetX = (svgWidth - (maxX - minX)) / 2  - minX;
        const offsetY = -minY + 50;

        // create a map for quick lookup
        const nodeMap = new Map<string, TrieNodeData>();
        nodes.forEach(node => nodeMap.set(node.id, node));

        return (
            <svg
                width={svgWidth}
                height={svgHeight}
                style={{ display: 'block' }}
            >
                <g transform={`translate(${offsetX}, ${offsetY})`}>
                    {/* Render edges (lines) first so they appear behind nodes */}
                    {nodes.map(node =>
                        node.children.map(childId => {
                            const child = nodeMap.get(childId);

                            if (!child) return null;

                            return (
                                <line
                                    key={`${node.id}-${childId}`}
                                    x1={node.x}
                                    y1={node.y}
                                    x2={child.x}
                                    y2={child.y}
                                    stroke="black"
                                    strokeWidth="2"
                                />
                            );
                        })
                    )}

                    {/* Render nodes (circles and text) */}
                    {nodes.map(node => {
                        // Determine node color based on state
                        let fillColor = "#FFF3E0";
                        let strokeColor = "black";
                        let strokeWidth = 2;

                        // check if this node represents a complete word the user inserted
                        const nodeWord = node.id.replace(/root-?/g, '').replace(/-/g, '');
                        const isRealCompleteWord = completeWords.has(nodeWord) && node.isEndOfWord;

                        if (animatingPath.includes(node.id)) {
                            fillColor = "red"; // currently animating
                        } else if (activePath.includes(node.id)) {
                            fillColor = "#FFAB91";
                        } else if (isRealCompleteWord) {
                            fillColor = "#FF7043";
                            strokeWidth = 3;
                        }

                        return (
                            <g key={node.id}>
                                {/* Circle for node */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={20}
                                    fill={fillColor}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                />

                                {/* Text label */}
                                <text
                                    x={node.x}
                                    y={node.y + 5}
                                    textAnchor="middle"
                                    fontSize="14"
                                    fontWeight="bold"
                                >
                                    {node.char}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        );
    };


    return (
        <div className="trie-visualizer">
            {/* control panel */}
            <div className="controls">
                <input
                    type="text"
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter a word"
                />

                {/* buttons */}
                <div className="button-group">
                    <button onClick={() => handleInsert()}>Add Word</button>
                    <button onClick={() => handleSearch('word')}>Search Word</button>
                    <button onClick={() => handleSearch('prefix')}>Search prefix</button>
                    <button onClick={() => handleDelete()}>Delete Word</button>
                </div>
            </div>

            {/* Display feedback message */}
            <div className="feedback">
                {feedbackMessage}
            </div>

            {/* Visualize Tree */}
            <div className="visualization">
                {renderTrie()}
            </div>
        </div>
    );
};
