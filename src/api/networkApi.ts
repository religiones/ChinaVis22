import { Node } from '../components/types';
import { post } from './http';

/**
 * 返回社区概览数据
 * @returns
 */
export const getAllCommunities = () => {
  return post('getAllCommunities', {});
};
/**
 * 根据显示节点数量展示网络
 * @param nodeNum 显示节点数量
 */
export const getNetWorkByCommunity = (communityId: number) => {
  return post('getNetworkByLimit', {
    communityId: communityId,
  });
};
/**
 * 根据filter框内的选项结合当前社区id查询子图
 * @param searchParams
 * @param filterNode
 * @returns
 */
export const getFilterNetworkByCommunities = (communities: number[]) => {
  return post('getFilterNetworkByCommunities', {
    communities,
  });
};
/**
 * 根据搜索参数查找子图
 * @param params
 * @returns
 */
export const getNetWorkByParams = (params: string) => {
  return post('getNetworkByParams', {
    searchParams: params,
  });
};

/**
 * 获取社区信息数据
 * @param communities 
 * @returns 
 */
export const getAllCommunitiesInfo = (communities: number[]) => {
  return post('getCommunitiesInfo', {
    communities,
  });
}

/**
 * 获取当前社区的邻居社区
 * @param communities 
 * @returns 
 */
export const getCurrNeighbours = (communities: number[]) => {
  return post('getCurrNeighbours', {
    communities,
  });
}

/**
 * 获取当前社区的rects
 * @param communities 
 * @returns 
 */
export const getCurrentCommunitiesRects = (communities: number[]) => {
  return post('getCurrRects', {
    communities,
  });
}