import { Select, Segmented, Slider, Row, Col } from 'antd';
import Search from 'antd/lib/input/Search';
import React, { useEffect, useState } from 'react';
import type { ControlBarProps, NodeType, Node, Tag } from './types';

/**
 * 系统左上角的控制面板
 * 搜索框语法：xxxxxx / xxxxxx>xxxxxx / Domain?email:xxxx / 1231245
 * @param props
 * @returns
 */
const ControlBar: React.FC<ControlBarProps> = (props) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [node, setNode] = useState<Node>(['IP', 'Cert', 'Domain']);
  const [tag, setTag] = useState<Tag>(['id', 'name', 'community']);
  const { searchParams, setSearchParams } = props;
  const { filterNode, setFilterNode } = props;
  const { tagFilter, setTagFilter } = props;
  const { currentGraph, setCurrentGraph } = props;
  const { range, setRange } = props;
  const { current } = tagFilter;

  const container = React.useRef(null);

  const getResult = (value: string) => {
    // setIsLoading(true);
    setSearchParams(value);
  };

  const filterChange = (nodes: Node) => {
    setFilterNode(nodes);
  };

  const filterNumChange = (node: any) => {};

  const onAfterChange = (range: [number, number]) => {
    setRange(range);
  };

  return (
    <div ref={container} style={{ width: '100%', height: '100%' }}>
      <Row style={{ width: '100%' }} align='middle'>
        <Search
          placeholder='input node or link want to search'
          style={{ width: '100%' }}
          enterButton='Search'
          loading={isLoading}
          onSearch={getResult}
        />
      </Row>
      <Row style={{ width: '100%' }} align='middle'>
        <Select
          mode='multiple'
          allowClear
          placeholder='filter node'
          //@ts-ignore
          defaultValue={filterNode}
          onChange={filterChange}
          style={{ width: '100%', marginTop: '8px' }}>
          {node.map((item) => (
            <Select.Option key={item} value={item}>
              {item}
            </Select.Option>
          ))}
        </Select>
      </Row>
      <Row style={{ width: '100%' }} align='middle'>
        <Segmented
          options={node}
          block
          onChange={(value) => {
            setTagFilter((prevState) => ({
              ...prevState,
              current: value as NodeType,
            }));
          }}
          value={current}
          style={{ width: '100%', marginTop: '8px' }}></Segmented>
      </Row>
      <Row style={{ width: '100%' }} align='middle'>
        <Segmented
          options={tag}
          block
          onChange={(value) => {
            setTagFilter((prevState) => ({ ...prevState, [current]: value }));
          }}
          value={tagFilter[current]}
          style={{ width: '100%', marginTop: '8px' }}></Segmented>
      </Row>

      <Row align='middle'>
        <Col span={8}>
          <Select
            style={{ width: '100%', marginLeft: '2px', marginTop: '10px' }}
            labelInValue
            defaultValue={{ value: 'Wrong_num', label: 'Wrong_num' }}
            onChange={filterNumChange}>
            <Select.Option value='Node_num'>Node_num</Select.Option>
            <Select.Option value='Wrong_num'>Wrong_num</Select.Option>
            <Select.Option value='Neighbour_num'>Neighbour_num</Select.Option>
          </Select>
        </Col>
        <Col span={16} push={1}>
          <Slider
            style={{ width: '85%', marginTop: '18px' }}
            min={0}
            max={1443}
            disabled={currentGraph.current !== 'allCommunity'}
            range
            step={1}
            defaultValue={range}
            onAfterChange={onAfterChange}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ControlBar;
