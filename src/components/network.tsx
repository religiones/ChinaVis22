import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllCommunities,
  getFilterNetworkByCommunities,
  getNetWorkByCommunity,
  getNetWorkByParams,
} from '../api/networkApi';
import ForceGraph, { ForceGraphInstance, GraphData } from 'force-graph';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import type { DataState, NetworkProps } from './types';
import * as THREE from 'three';
import { Descriptions, Switch } from 'antd';

/**
 * 主图组件
 */
let graph: any = null;

//React FC 写法 推荐写这种
const Network: React.FC<NetworkProps> = (props) => {
  const container = React.useRef();
  const linkColor = ['rgba(0,0,0,0.2)', 'rgba(255,255,255,0.1)'];
  const [didMountState, setDidMountState] = useState(false);
  const [currentListState, setCurrentListState] = useState<Boolean>(false);
  const {
    currentGragh,
    setCurrentGraph,
    searchParams,
    filterNode,
    tagFilter,
    data,
    setData,
    selectNode,
    range,
  } = props;

  const getData = (func: Function, params: any) => {
    let data = func(...params);
    return new Promise((resolve, reject) => {
      resolve(data);
    });
  };

  const drawGraph = () => {
    graph
      ?.graphData({ nodes: [], links: [] })
      .backgroundColor('#CFD8DC')

      .onNodeClick((node: any) => {
        console.log(node);
      })
      .nodeLabel((node: any) => {
        const { IP, Cert, Domain } = tagFilter;
        switch (node.group) {
          case 'IP':
            return node.properties[IP];
          case 'Cert':
            return node.properties[Cert];
          case 'Domain':
            return node.properties[Domain];
        }
      })
      .linkVisibility(true)
      .linkColor(() => linkColor[0])
      .linkDirectionalParticles(1)
      .linkDirectionalParticleWidth(2)
      .nodeThreeObject((node: any) => {
        let shape = null;
        let geometry: any = null;
        let color;
        switch (node.group) {
          case 'Domain':
            color = '#dcd6c5';
            geometry = new THREE.SphereGeometry((node.weight + 1) * 3);
            break;
          case 'Cert':
            color = '#e87e5c';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'IP':
            color = '#335a71';
            geometry = new THREE.SphereGeometry(10);
            break;
          default:
        }

        let material = new THREE.MeshToonMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
        });
        shape = new THREE.Mesh(geometry, material);
        return shape;
      })

      .showNavInfo(false)
      .onNodeDragEnd((node: any) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      });
    //@ts-ignore
    graph.d3Force('link').distance((link: any) => 50);
  };
  const initGraph = () => {
    graph
      ?.graphData({ nodes: [], links: [] })
      .backgroundColor('#CFD8DC')

      .nodeColor(() => {
        return '#685e48';
      })
      .nodeOpacity(0.95)
      .nodeVal((node: any) => {
        return (node.wrong_num * node.wrong_num) / 200;
      })
      .nodeLabel((node: any) => {
        return node.id;
      })
      .linkColor(() => linkColor[0])
      .linkDirectionalParticles(0)
      .nodeThreeObject(() => {})
      // .nodeThreeObject((node: any) => {
      //   let shape = null;
      //   let geometry: any = null;
      //   let material = new THREE.MeshToonMaterial({
      //     color: '#173728',
      //     // transparent: true,
      //     // opacity: 0.75,
      //   });
      //   let r = 0;
      //   if (node.neighbour.length > 10) {
      //     r = node.neighbour.length / 15;
      //   } else {
      //     r = 1;
      //   }
      //   geometry = new THREE.SphereGeometry(node.wrong_num / 20);
      //   shape = new THREE.Mesh(geometry, material);
      //   return shape;
      // })
      .onNodeDragEnd((node: any) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      })
      .showNavInfo(false);

    //@ts-ignore
    graph.d3Force('link').distance((link: any) => 100);
  };
  //切换视图显示
  const switchChange = (item: any) => {
    if (!item) {
      setCurrentGraph((prevState) => ({
        ...prevState,
        current: 'allCommunity',
      }));
    }
    setCurrentListState(item);
  };
  /**
   * 监听searchParams,搜索框变化，查询对应数据
   * 调用setData,setCurrentGraph
   */
  useEffect(() => {
    if (didMountState) {
      getData(getNetWorkByParams, [searchParams]).then((dataset: any) => {
        console.log(dataset);
        if (dataset.data.nodes) {
          if (dataset.type === 'communities') {
            const arr: any = searchParams.split(',').map((item) => {
              return Number.parseInt(item);
            });
            setCurrentGraph({
              current: 'searchStr',
              communities: arr,
            });
          } else {
            setCurrentGraph({
              current: 'searchStr',
            });
          }
          setData(dataset.data);
        } else {
          console.log(dataset);
        }
      });
    }
  }, [searchParams]);
  /**
   * 监听data,数据变化,更改绘图数据并更新图
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      if (currentGragh.current === 'allCommunity') {
        let links = data.links.filter((link: any) => {
          return (
            link?.sourceNode[0].wrong_num >= range[0] &&
            link?.sourceNode[0].wrong_num <= range[1] &&
            link?.targetNode[0].wrong_num >= range[0] &&
            link?.targetNode[0].wrong_num <= range[1]
          );
        });
        let nodes = data.nodes.filter((node: any) => {
          return node.wrong_num >= range[0] && node.wrong_num <= range[1];
        });
        graph.graphData({ nodes: nodes, links: links });
      } else {
        graph?.graphData(data);
      }
    }
  }, [data.nodes, data.links]);
  /**
   * 监听filterNode,按类别过滤节点
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      const dist = {
        r_cname: ['Domain', 'Domain'],
        r_subdomain: ['Domain', 'Domain'],
        r_request_jump: ['Domain', 'Domain'],
        r_cert: ['Cert', 'Domain'],
        r_cert_chain: ['Cert', 'Cert'],
        r_dns_a: ['IP', 'Domain'],
      };
      const dataset: any = { nodes: [], links: [] };
      dataset.nodes = data.nodes.filter((item: any) => {
        return filterNode.includes(item.group);
      });
      dataset.links = data.links.filter((item: any) => {
        return (
          //@ts-ignore
          filterNode.includes(dist[item.type][0]) &&
          //@ts-ignore
          filterNode.includes(dist[item.type][1])
        );
      });
      graph?.graphData(dataset);
    }
  }, [filterNode]);
  /**
   * 监听tagFilter,更改鼠标指向节点标签
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      //@ts-ignore
      graph.nodeLabel((node: any) => {
        const { IP, Cert, Domain } = tagFilter;
        switch (node.group) {
          case 'IP':
            return node.properties[IP];
          case 'Cert':
            return node.properties[Cert];
          case 'Domain':
            return node.properties[Domain];
        }
      });
    }
  }, [tagFilter.IP, tagFilter.Cert, tagFilter.Domain]);
  /**
   * 监听currentGragh,绘制不同场景的图，以及list更新
   * 调用setData,setCurrentListState
   */
  useEffect(() => {
    if (didMountState) {
      if (currentGragh.current === 'searchStr') {
        // do nothing wait data change
        drawGraph();
      } else if (currentGragh.current === 'communities') {
        getData(getFilterNetworkByCommunities, [currentGragh.communities]).then(
          (dataset: any) => {
            setData(dataset);
            drawGraph();
          }
        );
        setCurrentListState(true);
      } else {
        // all communities connected graph

        getData(getAllCommunities, []).then((dataset: any) => {
          setData(dataset);
          initGraph();
        });
        setCurrentListState(false);
      }
    }
  }, [currentGragh.current, currentGragh.communities]);

  /**
   * 监听selectNode,选取节点高亮显示
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      graph.nodeThreeObject((node: any) => {
        let shape = null;
        let geometry: any = null;
        let color;
        switch (node.group) {
          case 'Domain':
            color = '#dcd6c5';
            geometry = new THREE.SphereGeometry((node.weight + 1) * 3);
            break;
          case 'Cert':
            color = '#e87e5c';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'IP':
            color = '#335a71';
            geometry = new THREE.SphereGeometry(10);
            break;
          default:
        }
        if (selectNode.includes(node.properties.id)) {
          color = '#ff0000';
        }
        let material = new THREE.MeshToonMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
        });
        shape = new THREE.Mesh(geometry, material);
        return shape;
      });
    }
  }, [selectNode]);

  /**
   * 监听range，过滤初始视图的节点
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      let links = data.links.filter((link: any) => {
        return (
          link?.sourceNode[0].wrong_num >= range[0] &&
          link?.sourceNode[0].wrong_num <= range[1] &&
          link?.targetNode[0].wrong_num >= range[0] &&
          link?.targetNode[0].wrong_num <= range[1]
        );
      });
      let nodes = data.nodes.filter((node: any) => {
        return node.wrong_num >= range[0] && node.wrong_num <= range[1];
      });
      graph.graphData({ nodes: nodes, links: links });
    }
  }, [range]);

  /**
   * 初始化，绑定元素
   */
  useEffect(() => {
    //@ts-ignore
    graph = ForceGraph3D()(container.current);

    initGraph();
    getData(getAllCommunities, []).then((dataset: any) => {
      setData(dataset);
    });
    setDidMountState(true);
    const { clientWidth, clientHeight }: any = container.current;
    graph.width(clientWidth).height(clientHeight);
  }, []);

  return (
    <>
      <div
        //@ts-ignore
        ref={container}
        id='network'
        style={{ width: '100%', height: '100%' }}></div>
      <Switch
        style={{
          // height: '8%',
          // width: '97.5%',
          // background: 'rgba(0,0,0,0.5)',
          position: 'absolute',
          right: 18,
          top: 50,
          zIndex: 999,
        }}
        disabled={currentGragh.current === 'allCommunity'}
        checked={currentListState as boolean}
        onChange={switchChange}
        checkedChildren='社区'
        unCheckedChildren='总览'
      />
      {/* <Descriptions title="nodeInfo" style={{ 
          position: 'absolute',
          right: 18,
          top: 50,
          zIndex: 999}}>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
        <Descriptions.Item label="nodeName">1</Descriptions.Item>
      </Descriptions> */}
    </>
  );
};

export default Network;
