import { post } from './http';

export const getNodeById = (NodeType: string, id: string) => {
  return post('getNodeById', {
    NodeType: id,
  });
};
export const getAllCommuntiesScatter = () => {
  return post('getAllCommuntiesScatter', {});
};

export const getLinksBT2Nodes = (source: string, target: string) => {
  return post('getLinksBT2Nodes', {
    node1: source,
    node2: target,
  });
};



 export const recommand = (id:string, communities:number[]) => {
  return post('recommand', {
    id,
    communities
  });
}