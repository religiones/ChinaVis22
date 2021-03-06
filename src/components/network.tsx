import React, { useEffect, useState } from 'react';
import {
  getAllCommunities,
  getCurrentCommunitiesRects,
  getFilterNetworkByCommunities,
  getNetWorkByParams,
} from '../api/networkApi';
import ForceGraph, { ForceGraphInstance, GraphData } from 'force-graph';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { NetworkProps, NodeType } from './types';
import * as THREE from 'three';
import { Button, Switch } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { addHiddenNodeAndLink, getData } from '../utils/utils';
import * as d3 from 'd3';

window.d3 = d3;
/**
 * 主图组件
 */
let graph: any = null;
let context: HTMLElement | null = null;
//React FC 写法 推荐写这种
const Network: React.FC<NetworkProps> = (props) => {
  const container = React.useRef();
  const linkColor = ['rgba(0,0,0,0.2)', 'rgba(255,255,255,0.3)'];
  // UE光效
  const bloomPass = new UnrealBloomPass(new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5,0.4,0.85);
  const [didMountState, setDidMountState] = useState(false);

  const [currentListState, setCurrentListState] = useState<Boolean>(false);
  const [switch3DState, setSwith3DState] = useState<boolean>(false);

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
    setSelectKeyNode,
    selectKeyNode,
    selectPaths,
    setSelectPaths,
    currentNode,
    setCurrentNode,
    selectCommunities,
    isFinish,
    setIsFinish
  } = props;

  const setSelectKeyState = (node: any) => {
    setSelectKeyNode((prevState: Set<any>) => {
      const newSet = new Set(Array.from(prevState));

      // 取消选择
      if (newSet.has(node)) {
        newSet.delete(node);
        return newSet;
      }
      // set size < 2
      if (newSet.size < 2) {
        newSet.add(node);
        return newSet;
      }
      // set size = 2
      const _ = Array.from(prevState).slice(1);
      _.push(node);
      return new Set(_);
    });
  };
  /**
   * 绘制社区3D网络图 '#CFD8DC'
   */
  const drawGraph = () => {
    graph
      ?.graphData({ nodes: [], links: [] })
      .backgroundColor('rgba(51,51,51,1)')
      .onNodeClick((node: any) => {
        setSelectKeyState(node);
        if(isFinish){
          setCurrentNode(node.properties.id);
          setIsFinish(false);
        }
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
          case 'Email':
            return node.properties.name;
          case 'Phone':
            return node.properties.name;
          case 'Register':
            return node.properties.name;
          default:
            break;
        }
      })
      .linkVisibility(true)
      .linkColor((line: any) => {
        switch (line.type) {
          case 'r_cname':
            return '#FF5B00';
          case 'r_subdomain':
            return '#00FFAB';
          case 'r_request_jump':
            return '#1363DF';
          case 'r_cert':
            return '#F73D93';
          case 'r_dns_a':
            return '#FFF56D'
          default:
            return linkColor[1];
        }
      })
      .linkDirectionalParticles(1)
      .linkDirectionalParticleWidth(2)

      .onNodeDragEnd((node: any) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      });
    if (!switch3DState) {
      graph
        .nodeThreeObject((node: any) => {
          let shape = null;
          let geometry: any = null;
          let color;
          if (
            node.properties.id !== currentNode &&
            !selectNode.includes(node.properties.id)
          ) {
            switch (node.group) {
              case 'Domain':
                color = '#78a58c';
                geometry = new THREE.SphereGeometry((node.weight + 1) * 3);
                break;
              case 'Cert':
                color = '#a0a87a';
                geometry = new THREE.SphereGeometry(10);
                break;
              case 'IP':
                color = '#a57878';
                geometry = new THREE.SphereGeometry(10);
                break;
              case 'Email':
                color = '#B7E778';
                geometry = new THREE.SphereGeometry(10);
                break;
              case 'Phone':
                color = '#B7E778';
                geometry = new THREE.SphereGeometry(10);
                break;
              case 'Register':
                color = '#B7E778';
                geometry = new THREE.SphereGeometry(10);
                break;
              default:
                break;
            }
          } else {
            color = '#ff0000';
            geometry = new THREE.SphereGeometry(10);
          }

          let material = new THREE.MeshToonMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
          });
          shape = new THREE.Mesh(geometry, material);
          return shape;
        })
        .showNavInfo(false);
        if(graph.postProcessingComposer().passes[1] != undefined){
          graph.postProcessingComposer().removePass(graph.postProcessingComposer().passes[1]);
        }
    } else {
      graph.nodeColor((node: any) => {
        if (
          node.properties.id !== currentNode &&
          !selectNode.includes(node.properties.id)
        ) {
          switch (node.group) {
            case 'Domain':
              return '#78a58c';
            case 'Cert':
              return '#a0a87a';
            case 'IP':
              return '#a57878';
            case 'Email':
              return '#00FF00';
            case 'Phone':
              return '#00FF00';
            case 'Register':
              return '#00FF00';
            default:
              break;
          }
        } else {
          return '#ff0000';
        }
      });
    }
    //@ts-ignore
    graph.d3Force('link').distance((link: any) => 50);
  };
  /**
   * 初始化绘制社区连接图
   */
  const initGraph = () => {
    graph
      ?.graphData({ nodes: [], links: [] })
      .backgroundColor('rgba(51,51,51,1)')

      .nodeLabel((node: any) => {
        return node.id;
      })
      .linkColor(() => linkColor[1])
      .linkDirectionalParticles(0)
      .onNodeDragEnd((node: any) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      })
      .onNodeClick((node: any) => {
        setCurrentGraph({
          current: 'communities',
          communities: [node.id],
        });
      });
    if (!switch3DState) {
      graph
        .nodeOpacity(0.95)
        // .nodeColor('#CFD8DC')
        .nodeThreeObject((node: any) => {
          let shape = null;
          let geometry: any = new THREE.SphereGeometry(node.wrong_num / 20);
          let color = '#E2D784';

          let material = new THREE.MeshToonMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
          });
          shape = new THREE.Mesh(geometry, material);
          return shape;
        })
        .showNavInfo(false);
      if(graph.postProcessingComposer().passes[1] != undefined){
        graph.postProcessingComposer().removePass(graph.postProcessingComposer().passes[1]);
      }
      graph.postProcessingComposer().addPass(bloomPass);
    } else {
      graph
        .nodeColor(() => {
          return '#E2D784';
        })
        .nodeVal((node: any) => {
          return node.wrong_num / 10;
        });
    }
    //@ts-ignore
    graph.d3Force('link').distance((link: any) => 100);
  };
  /**
   * 高亮节点
   */
  type numberNodes = {
    type: 'number';
    nodes: number[];
  };

  type stringNodes = {
    type: 'string';
    nodes: string[];
  };

  /**
   * 高亮节点
   */
  const highLightNodes = ({ type, nodes }: numberNodes | stringNodes) => {
    if (!switch3DState) {
      graph.nodeThreeObject((node: any) => {
        let shape = null;
        let geometry: any = null;
        let color;
        switch (node.group) {
          case 'Domain':
            color = '#78a58c';
            geometry = new THREE.SphereGeometry((node.weight + 1) * 3);
            break;
          case 'Cert':
            color = '#a0a87a';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'IP':
            color = '#a57878';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'Email':
            color = '#B7E778';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'Phone':
            color = '#B7E778';
            geometry = new THREE.SphereGeometry(10);
            break;
          case 'Register':
            color = '#B7E778';
            geometry = new THREE.SphereGeometry(10);
            break;
          default:
            break;
        }
        let res = undefined;
        if (type === 'string') {
          res = nodes.includes(node.properties.id);
        } else {
          res = nodes.includes(node.id);
        }
        if (res) {
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
    } else {
      graph.nodeColor((node: any) => {
        let res = undefined;
        if (type === 'string') {
          res = nodes.includes(node.properties.id);
        } else {
          res = nodes.includes(node.id);
        }
        if (res) {
          return '#ff0000';
        } else {
          switch (node.group) {
            case 'Domain':
              return '#78a58c';
            case 'Cert':
              return '#a0a87a';
            case 'IP':
              return '#a57878';
            case 'Email':
              return '#B7E778';
            case 'Phone':
              return '#B7E778';
            case 'Register':
              return '#B7E778';
            default:
              break;
          }
        }
      });
    }
  };
  /**
   * 高亮边
   */
  const highLightLinks = (links: number[]) => {
    graph
      .linkColor((link: any) => {
        if (links.includes(link.identity)) {
          return '#ff0000';
        } else {
          switch (link.type) {
            case 'r_cname':
              return '#FF5B00';
            case 'r_subdomain':
              return '#00FFAB';
            case 'r_request_jump':
              return '#1363DF';
            case 'r_cert':
              return '#F73D93';
            case 'r_dns_a':
              return '#FFF56D'
            default:
              return linkColor[1];
          }
        }
      })
      .linkWidth((link: any) => {
        if (links.includes(link.identity)) {
          return 4;
        } else {
          return 1;
        }
      })
      .linkDirectionalParticleWidth((link: any) => {
        if (links.includes(link.identity)) {
          return 4;
        } else {
          return 2;
        }
      });
  };
  /**
   * 切换视图显示
   */
  const switchViewChange = (item: boolean) => {
    if (!item) {
      d3.select('#svg-communitiesInfo').remove();
      setCurrentGraph((prevState) => ({
        current: 'allCommunity',
        communities: [],
      }));
    }
    setCurrentListState(item);
  };
  /**
   * 切换3D/2D模式
   */
  const switch3DViewChange = (item: boolean) => {
    setSwith3DState(item);
  };
  /**
   * 画当前社区矩阵图
   */
  const drawCurrentCommunitiesRects = (currentCommunitiesInfo: NodeType[]) => {
    console.log(currentCommunitiesInfo);

    if (currentCommunitiesInfo.length !== 0) {
      const width = 100;
      const rectHeight = 30;
      const rectWidth = 15;
      const margin = 5;
      const height = currentCommunitiesInfo.length * (rectHeight + margin);
      d3.select('#svg-communitiesInfo').remove();
      const svg = d3
        .select('#communitiesInfo')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('id', 'svg-communitiesInfo');
      const g = svg
        .selectAll('g')
        .data(currentCommunitiesInfo)
        .enter()
        .append('g')
        .attr('transform', (_: any, i: number) => {
          return `translate(0,${i * (rectHeight + margin)})`;
        });

      g.each(function (d: any) {
        const heightScale = d3
          .scaleLinear()
          .domain([0, d.wrong_sum])
          .range([0, rectHeight]);
        const colorScale = d3
          .scaleOrdinal()
          .domain([
            'porn',
            'gambling',
            'fraud',
            'drug',
            'gun',
            'hacker',
            'trading',
            'pay',
            'other',
            'none',
          ])
          .range([
            '#f49c84',
            '#099EDA',
            '#FEE301',
            '#ABB7BD',
            '#F4801F',
            '#D6C223',
            '#D75D73',
            '#E0592B',
            '#58B7B3',
            '#68bb8c',
          ]);
        const wrongList = d.wrong_list;
        if (wrongList.length != 0) {
          d3.select(this)
            .selectAll('rect')
            .data(d.wrong_list)
            .enter()
            .append('rect')
            .attr('width', rectWidth)
            .attr('height', (d: any) => {
              return heightScale(d.num);
            })
            .attr('fill', (d: any): string => {
              return colorScale(d.type) as string;
            })
            .attr('transform', (d: any) => {
              let i = wrongList.indexOf(d);
              let lastRectHeight = 0;
              while (i > 0) {
                lastRectHeight += heightScale(wrongList[i - 1].num);
                i--;
              }
              return `translate(0,${lastRectHeight})`;
            });
        } else {
          d3.select(this)
            .append('rect')
            .attr('height', rectHeight)
            .attr('width', rectWidth)
            .attr('fill', '#68bb8c');
        }
        d3.select(this)
          .append('text')
          .text((d: any) => {
            return d.id;
          })
          .attr('transform', (_: any, i: number) => {
            return `translate(${rectWidth + margin},${
              i * (rectHeight + margin) + rectHeight / 2 + 5
            })`;
          })
          .style('fill', '#eee');
      });
      g.on('click', function (e: any, d: any) {
        //删除communitiesID
        if (currentGragh.communities.length != 0) {
          let arr = [...currentGragh.communities];
          arr.splice(arr.indexOf(d.id), 1);
          setCurrentGraph((prevState: any) => {
            return {
              ...prevState,
              communities: arr,
            };
          });
        }
      }).on('mouseover', function () {
        d3.select(this).style('cursor', 'pointer');
      });
    }
  };

  /**
   * 导出currentCommunities到剪贴板
   */
  const exportCommunities = () => {
    const str = currentGragh.communities.join(',');
    var aux = document.createElement('input');
    aux.setAttribute('value', str);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand('copy');
    document.body.removeChild(aux);
  };

  /**
   * 导出子图到csv文件
   */
  const toCSV = () => {
    const industryScale = d3
      .scaleOrdinal()
      .domain([
        'porn',
        'gambling',
        'fraud',
        'drug',
        'gun',
        'hacker',
        'trading',
        'pay',
        'other',
      ])
      .range(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    const nodes = data.nodes;
    const links = data.links;

    const nodeHead = 'id,name,type,industry\n';
    const linkHead = 'relation,source,target\n';
    //提取边
    let linkRow = '';
    for (let i = 0; i < links.length; i++) {
      const source = links[i].source.properties.id;
      const target = links[i].target.properties.id;
      const type = links[i].type;
      linkRow += `${type},${source},${target}\n`;
    }
    //提取节点
    let nodeRow = '';
    for (let i = 0; i < nodes.length; i++) {
      //Cert
      const id = nodes[i].properties.id;
      const name = nodes[i].properties.name;
      const type = nodes[i].group;
      const industry = [];
      if (nodes[i].group === 'IP') {
        //IP
        if (nodes[i].properties.ipc_id != undefined) {
          //IPC
          const ipc_id = nodes[i].properties.ipc_id;
          const ipc_name = nodes[i].properties.ipc;
          const ipc_type = 'IP_C';
          nodeRow += `${ipc_id},${ipc_name},${ipc_type},"[${industry}]"\n`;
          linkRow += `r_cidr,${nodes[i].properties.id},${ipc_id}\n`;
        }
        if (nodes[i].properties.asn_id != undefined) {
          //ASN
          const asn_id = nodes[i].properties.asn_id;
          const asn_name = nodes[i].properties.asn;
          const asn_type = 'ASN';
          nodeRow += `${asn_id},${asn_name},${asn_type},"[${industry}]"\n`;
          linkRow += `r_asn,${nodes[i].properties.id},${asn_id}\n`;
        }
      } else if (nodes[i].group === 'Domain') {
        //Domain
        //获取industry
        const industryType = Object.entries(nodes[i].properties)
          .filter(([, flag]) => flag === 'True')
          .map(([key]) => key);
        industryType.forEach((type: string) => {
          industry.push(industryScale(type));
        });
        // if (nodes[i].properties.email_id != undefined) {
        //   //Email
        //   const email_id = nodes[i].properties.email_id;
        //   const email_name = nodes[i].properties.email;
        //   const email_type = 'Whois_Email';
        //   nodeRow += `${email_id},${email_name},${email_type},"[${industry}]"\n`;
        //   linkRow += `r_whois_email,${nodes[i].properties.id},${email_id}\n`;
        // }
        // if (nodes[i].properties.phone_id != undefined) {
        //   //Phone
        //   const phone_id = nodes[i].properties.phone_id;
        //   const phone_name = nodes[i].properties.phone;
        //   const phone_type = 'Whois_Phone';
        //   nodeRow += `${phone_id},${phone_name},${phone_type},"[${industry}]"\n`;
        //   linkRow += `r_whois_phone,${nodes[i].properties.id},${phone_id}\n`;
        // }
        // if (nodes[i].properties.register_id != undefined) {
        //   //Register
        //   const register_id = nodes[i].properties.register_id;
        //   const register_name = nodes[i].properties.register;
        //   const register_type = 'Whois_Name';
        //   nodeRow += `${register_id},${register_name},${register_type},"[${industry}]"\n`;
        //   linkRow += `r_whois_name,${nodes[i].properties.id},${register_id}\n`;
        // }
      }
      nodeRow += `${id},${name},${type},"[${industry}]"\n`;
    }
    const nodeCSV = nodeHead + nodeRow;
    const linkCSV = linkHead + linkRow;
    const nodeElement = document.createElement('a');
    nodeElement.href =
      'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(nodeCSV);
    //provide the name for the CSV file to be downloaded
    nodeElement.download = `nodes-${currentGragh.communities.join('-')}.csv`;
    nodeElement.click();
    nodeElement.remove();

    const linkElement = document.createElement('a');
    linkElement.href =
      'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(linkCSV);
    //provide the name for the CSV file to be downloaded
    linkElement.download = `links-${currentGragh.communities.join('-')}.csv`;
    linkElement.click();
    linkElement.remove();
  };
  /**
   * 添加社区
   */
  const addCommunities = () => {
    if (currentGragh.current !== 'allCommunity') {
      let currentCommunities = [];
      if (currentGragh.communities !== undefined) {
        currentCommunities = [...currentGragh.communities];
      }
      setCurrentGraph({
        current: 'communities',
        communities: Array.from(
          new Set([...currentCommunities, ...selectCommunities])
        ),
      });
    }
  };
  /**
   * 删除节点
   */
  const removeNodes = () => {
    let data = graph.graphData();
    let nodes = data.nodes.filter((item: any) => {
      return !selectNode.includes(item.properties.id);
    });
    let links = data.links.filter((item: any) => {
      return !(
        selectNode.includes(item.source.properties.id) ||
        selectNode.includes(item.target.properties.id)
      );
    });
    setData({ nodes: nodes, links: links });
  };
  /**
   * 清楚选择
   */
  const clearSelected = () => {
    setCurrentNode('');
    setSelectKeyNode(new Set());
    setSelectPaths(new Set());
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
              current: 'communities',
              communities: arr,
            });
          } else {
            setCurrentGraph({
              current: 'searchStr',
              communities: [...currentGragh.communities],
            });
            const addedData = addHiddenNodeAndLink(dataset.data);
            drawGraph();
            setData(addedData);
          }
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
            link?.sourceNode[0].wrong_num >= range.currMin &&
            link?.sourceNode[0].wrong_num <= range.currMax &&
            link?.targetNode[0].wrong_num >= range.currMin &&
            link?.targetNode[0].wrong_num <= range.currMax
          );
        });
        let nodes = data.nodes.filter((node: any) => {
          return (
            node.wrong_num >= range.currMin && node.wrong_num <= range.currMax
          );
        });
        graph
          .graphData({ nodes: nodes, links: links })
          .cooldownTicks(80)
          .onEngineStop(() => graph.zoomToFit(500));
      } else {
        graph
          ?.graphData(data)
          .cooldownTicks(80)
          .onEngineStop(() => graph.zoomToFit(500));
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
        return (
          item.group === 'Email' ||
          item.group === 'Phone' ||
          item.group === 'Register' ||
          filterNode.includes(item.group)
        );
      });
      dataset.links = data.links.filter((item: any) => {
        return (
          item.type === 'r_whois_email' ||
          item.type === 'r_whois_phone' ||
          item.type === 'r_whois_name' ||
          //@ts-ignore
          (filterNode.includes(dist[item.type][0]) &&
            //@ts-ignore
            filterNode.includes(dist[item.type][1]))
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
          default:
            return node.properties.name;
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
        // drawGraph();
        setCurrentListState(true);
      } else if (currentGragh.current === 'communities') {
        getData(getFilterNetworkByCommunities, [currentGragh.communities]).then(
          (dataset: any) => {
            const addedData = addHiddenNodeAndLink(dataset);
            drawGraph();
            setData(addedData);
          }
        );
        getData(getCurrentCommunitiesRects, [currentGragh.communities]).then(
          (dataset: any) => {
            drawCurrentCommunitiesRects(dataset);
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
      highLightNodes({ type: 'string', nodes: selectNode });
    }
  }, [selectNode]);
  /**
   * 监听selectPaths，选取路径高亮
   */
  useEffect(() => {
    if (didMountState) {
      const selectPathsArray = Array.from(selectPaths);
      let nodes: number[] = [];
      let links: number[] = [];
      selectPathsArray.forEach((path: any) => {
        nodes.push(
          ...path.nodes.map((node: any) => {
            return node.id;
          })
        );
        links.push(
          ...path.links.map((link: any) => {
            return link.identity;
          })
        );
        highLightNodes({ type: 'number', nodes: nodes });
        highLightLinks(links);
      });
    }
  }, [selectPaths]);
  /**
   * 监听range，过滤初始视图的节点
   * 无调用
   */
  useEffect(() => {
    if (didMountState) {
      let links, nodes;
      if (range.select === 'Wrong_num') {
        links = data.links.filter((link: any) => {
          return (
            link.sourceNode[0].wrong_num >= range.currMin &&
            link.sourceNode[0].wrong_num <= range.currMax &&
            link.targetNode[0].wrong_num >= range.currMin &&
            link.targetNode[0].wrong_num <= range.currMax
          );
        });
        nodes = data.nodes.filter((node: any) => {
          return (
            node.wrong_num >= range.currMin && node.wrong_num <= range.currMax
          );
        });
      } else if (range.select === 'Node_num') {
        links = data.links.filter((link: any) => {
          return (
            link.sourceNode[0].node_num >= range.currMin &&
            link.sourceNode[0].node_num <= range.currMax &&
            link.targetNode[0].node_num >= range.currMin &&
            link.targetNode[0].node_num <= range.currMax
          );
        });
        nodes = data.nodes.filter((node: any) => {
          return (
            node.node_num >= range.currMin && node.node_num <= range.currMax
          );
        });
      } else {
        links = data.links.filter((link: any) => {
          return (
            link.sourceNode[0].neighbour.length >= range.currMin &&
            link.sourceNode[0].neighbour.length <= range.currMax &&
            link.targetNode[0].neighbour.length >= range.currMin &&
            link.targetNode[0].neighbour.length <= range.currMax
          );
        });
        nodes = data.nodes.filter((node: any) => {
          return (
            node.neighbour.length >= range.currMin &&
            node.neighbour.length <= range.currMax
          );
        });
      }
      graph.graphData({ nodes: nodes, links: links });
    }
  }, [range]);
  /**
   * 监听3DState，切换3D/2D模式
   * 无调用
   */
  useEffect(() => {
    if (context == null) return;
    const dataset = graph.graphData();
    if (switch3DState) {
      // 2D模式
      graph = ForceGraph()(context);
    } else {
      // 3D模式
      graph = ForceGraph3D()(context);
    }
    if (currentGragh.current === 'allCommunity') {
      initGraph();
    } else {
      drawGraph();
    }
    const { clientWidth, clientHeight }: any = container.current;
    graph.width(clientWidth).height(clientHeight);
    graph.graphData(dataset);
  }, [switch3DState]);
  /**
   * 监听selectKeyNode
   */
  useEffect(() => {
    if (didMountState) {
      console.log(selectKeyNode);
      if (!switch3DState) {
        graph.nodeThreeObject((node: any) => {
          let shape = null;
          let geometry: any = null;
          let color;
          switch (node.group) {
            case 'Domain':
              color = '#78a58c';
              geometry = new THREE.SphereGeometry((node.weight + 1) * 3);
              break;
            case 'Cert':
              color = '#a0a87a';
              geometry = new THREE.SphereGeometry(10);
              break;
            case 'IP':
              color = '#a57878';
              geometry = new THREE.SphereGeometry(10);
              break;
            case 'Email':
              color = '#B7E778';
              geometry = new THREE.SphereGeometry(10);
              break;
            case 'Phone':
              color = '#B7E778';
              geometry = new THREE.SphereGeometry(10);
              break;
            case 'Register':
              color = '#B7E778';
              geometry = new THREE.SphereGeometry(10);
              break;
            default:
              break;
          }
          if (new Set(selectKeyNode).has(node)) {
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
      } else {
        graph.nodeColor((node: any) => {
          if (new Set(selectKeyNode).has(node)) {
            return '#ff0000';
          } else {
            switch (node.group) {
              case 'Domain':
                return '#78a58c';
              case 'Cert':
                return '#a0a87a';
              case 'IP':
                return '#a57878';
              case 'Email':
                return '#B7E778';
              case 'Phone':
                return '#B7E778';
              case 'Register':
                return '#B7E778';
              default:
                break;
            }
          }
        });
      }
    }
  }, [selectKeyNode]);

  /**
   * 初始化，绑定元素
   */
  useEffect(() => {
    //@ts-ignore
    if (container.current != undefined) {
      context = container.current;
      graph = ForceGraph3D()(context);
    }
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
        style={{ width: '100%', height: '100%' }}
      ></div>
      <Switch
        style={{
          position: 'absolute',
          right: 18,
          top: 50,
          zIndex: 999,
          border: '1px solid #646464',
        }}
        disabled={currentGragh.current === 'allCommunity'}
        checked={currentListState as boolean}
        onChange={switchViewChange}
        checkedChildren='社区'
        unCheckedChildren='总览'
      />
      <Switch
        style={{
          position: 'absolute',
          right: 90,
          top: 50,
          zIndex: 999,
          border: '1px solid #646464',
        }}
        checked={switch3DState as boolean}
        onChange={switch3DViewChange}
        checkedChildren='2D'
        unCheckedChildren='3D'
      />
      <Button
        type='primary'
        style={{ position: 'absolute', right: 150, top: 50 }}
        shape='round'
        icon={<DownloadOutlined />}
        size={'small'}
        onClick={toCSV}
      >
        Download
      </Button>
      <Button
        type='primary'
        style={{ position: 'absolute', right: 280, top: 50 }}
        shape='round'
        size={'small'}
        onClick={removeNodes}
      >
        Remove Nodes
      </Button>
      <Button
        type='primary'
        style={{ position: 'absolute', right: 420, top: 50 }}
        shape='round'
        size={'small'}
        onClick={clearSelected}
      >
        Clear Selected
      </Button>
      <Button
        type='primary'
        style={{ position: 'absolute', right: 550, top: 50 }}
        shape='round'
        size={'small'}
        onClick={addCommunities}
      >
        Add Communities
      </Button>
      <Button
        type='primary'
        style={{ position: 'absolute', left: 90, top: 50 }}
        shape='round'
        size={'small'}
        onClick={exportCommunities}
      >
        Copy Communities
      </Button>
      <div
        id='communitiesInfo'
        style={{
          position: 'absolute',
          left: 10,
          top: 50,
          height: '100%',
          width: '8%',
          overflowY: 'scroll',
        }}
      ></div>
    </>
  );
};

export default Network;
