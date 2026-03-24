use bitcoin::hashes::{sha256, Hash};

pub struct MerkleTree {
    leaves: Vec<sha256::Hash>,
}

impl MerkleTree {
    pub fn from_data(data: &[&[u8]]) -> Self {
        let leaves = data.iter().map(|d| sha256::Hash::hash(d)).collect();
        MerkleTree { leaves }
    }

    pub fn from_hashes(leaves: Vec<sha256::Hash>) -> Self {
        MerkleTree { leaves }
    }

    pub fn root(&self) -> Option<sha256::Hash> {
        if self.leaves.is_empty() {
            return None;
        }
        Some(Self::compute_root(&self.leaves))
    }

    fn compute_root(nodes: &[sha256::Hash]) -> sha256::Hash {
        if nodes.len() == 1 {
            return nodes[0];
        }

        let mut next_level = Vec::new();
        for chunk in nodes.chunks(2) {
            if chunk.len() == 2 {
                let mut concat = chunk[0].to_byte_array().to_vec();
                concat.extend_from_slice(&chunk[1].to_byte_array());
                next_level.push(sha256::Hash::hash(&concat));
            } else {
                // duplicate last node if odd number of nodes
                let mut concat = chunk[0].to_byte_array().to_vec();
                concat.extend_from_slice(&chunk[0].to_byte_array());
                next_level.push(sha256::Hash::hash(&concat));
            }
        }
        Self::compute_root(&next_level)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merkle_root() {
        let data: Vec<&[u8]> = vec![b"leaf1", b"leaf2", b"leaf3"];
        let tree = MerkleTree::from_data(&data);
        assert!(tree.root().is_some());
    }
}
