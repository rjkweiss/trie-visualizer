export class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;

    constructor() {
        this.children = new Map<string, TrieNode>();
        this.isEndOfWord = false;
    }
}

export class Trie {
    private root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    // add word into trie
    insert(word: string): void {
        let currentNode = this.root;
        for (const char of word) {
            if (!currentNode.children.has(char)) {
                currentNode.children.set(char, new TrieNode());
            }
            currentNode = currentNode.children.get(char)!;
        }
        // mark end of word
        currentNode.isEndOfWord = true;
    }

    // search full word from trie
    searchWord(word: string): boolean {
        let currentNode = this.root;

        for (const char of word) {
            if (! currentNode.children.has(char)) return false;
            currentNode = currentNode.children.get(char)!;
        }
        return currentNode.isEndOfWord;
    }

    // search prefix from trie
    startsWith(prefix: string): boolean {
        let currentNode = this.root;

        for (const char of prefix) {
            if (!currentNode.children.has(char)) return false;
            currentNode = currentNode.children.get(char)!;
        }

        // if we got here, we found the prefix
        return true;
    }

    // Remove word from prefix
    delete(word: string): boolean {
        const helper = (node: TrieNode, word: string, index: number): boolean => {
            // no word found
            if (!node) return false;

            // check if we found the entire word
            if (index === word.length) {
                // is this the entire word or just prefix (do not delete prefixes)
                if (!node.isEndOfWord) return false;

                // otherwise, un mark the end of this word
                node.isEndOfWord = false;

                // return true if current node doesn't have any other children
                return node.children.size === 0;
            }

            // get current char
            const char = word[index];
            const childNode = node.children.get(char);

            // exit early if next node is empty
            if (!childNode) return false;

            // recursively delete from child nodes
            const shouldDeleteChild = helper(childNode, word, index + 1);

            if (shouldDeleteChild) {
                node.children.delete(char);

                // return true if current node has no other children and is not end of word
                return node.children.size === 0 && !node.isEndOfWord;
            }

            return false;
        };

        return helper(this.root, word, 0);
    }

    getRoot(): TrieNode {
        return this.root;
    }
}
