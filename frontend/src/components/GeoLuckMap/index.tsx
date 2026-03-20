
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Box, Spinner, Text, VStack, Button, Badge } from '@chakra-ui/react';

interface GeoLuckMapProps {
    nodes: Array<{
        latitude: number;
        longitude: number;
        score: number;
        primaryAspect: string;
    }>;
    recommendations: {
        career: any;
        personal: any;
        wealth: any;
    };
    isLoading?: boolean;
}

export const GeoLuckMap: React.FC<GeoLuckMapProps> = ({ nodes, recommendations, isLoading }) => {

    // Process nodes into heatmap data: [lng, lat, score]
    const heatmapData = useMemo(() => {
        return nodes.map(node => [node.longitude, node.latitude, node.score]);
    }, [nodes]);

    // Special markers for recommendations
    const scatterData = useMemo(() => {
        const markers = [];
        if (recommendations.career) {
            markers.push({
                name: 'Best Career',
                value: [recommendations.career.longitude, recommendations.career.latitude, recommendations.career.score],
                itemStyle: { color: '#fbbf24' }
            });
        }
        if (recommendations.personal) {
            markers.push({
                name: 'Best Relationship',
                value: [recommendations.personal.longitude, recommendations.personal.latitude, recommendations.personal.score],
                itemStyle: { color: '#ec4899' }
            });
        }
        if (recommendations.wealth) {
            markers.push({
                name: 'Best Wealth',
                value: [recommendations.wealth.longitude, recommendations.wealth.latitude, recommendations.wealth.score],
                itemStyle: { color: '#10b981' }
            });
        }
        return markers;
    }, [recommendations]);

    const option = {
        backgroundColor: 'transparent',
        title: {
            text: 'Global Luck Projection',
            left: 'center',
            textStyle: {
                color: '#fff',
                fontSize: 16,
                fontWeight: 'normal'
            },
            top: 10
        },
        visualMap: {
            min: 40,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 20,
            inRange: {
                color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
            },
            textStyle: {
                color: '#fff'
            }
        },
        geo: {
            map: 'world',
            roam: true,
            emphasis: {
                label: {
                    show: false
                },
                itemStyle: {
                    areaColor: '#2a333d'
                }
            },
            itemStyle: {
                areaColor: '#1a202c',
                borderColor: '#2d3748'
            }
        },
        series: [
            {
                name: 'Luck Intensity',
                type: 'heatmap',
                coordinateSystem: 'geo',
                data: heatmapData,
                pointSize: 15,
                blurSize: 20
            },
            {
                name: 'Top Spots',
                type: 'scatter',
                coordinateSystem: 'geo',
                data: scatterData,
                symbolSize: 12,
                label: {
                    formatter: '{b}',
                    position: 'right',
                    show: false
                },
                emphasis: {
                    label: {
                        show: true
                    }
                }
            }
        ]
    };

    if (isLoading) {
        return (
            <VStack h="500px" justify="center" bg="gray.900" borderRadius="xl">
                <Spinner size="xl" color="teal.500" />
                <Text color="gray.400">Scanning planetary lines...</Text>
            </VStack>
        );
    }

    if (nodes.length === 0) {
        return (
            <VStack h="500px" justify="center" bg="gray.900" borderRadius="xl">
                <Text color="gray.500">No scan data yet. Click 'Satellite Scan' to begin.</Text>
            </VStack>
        );
    }

    return (
        <Box
            h="500px"
            w="100%"
            bg="gray.950"
            borderRadius="2xl"
            overflow="hidden"
            border="1px solid"
            borderColor="whiteAlpha.100"
            position="relative"
        >
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                onChartReady={(chart) => {
                    // Register world map once chart is ready
                    fetch('https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/world.json')
                        .then(res => res.json())
                        .then(json => {
                            echarts.registerMap('world', json);
                            chart.setOption(option);
                        });
                }}
            />

            {/* Legend Overlay */}
            <Box position="absolute" top="40px" right="20px" bg="blackAlpha.700" p={3} borderRadius="md" border="1px solid whiteAlpha.200" backdropFilter="blur(5px)">
                <VStack align="start" spacing={2}>
                    <Text fontSize="10px" fontWeight="bold" color="gray.300" letterSpacing="1px">GEO LUCK KEY</Text>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box w={2} h={2} borderRadius="full" bg="#fbbf24" boxShadow="0 0 5px #fbbf24" />
                        <Text fontSize="10px" color="white">Best Career Spot</Text>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box w={2} h={2} borderRadius="full" bg="#ec4899" boxShadow="0 0 5px #ec4899" />
                        <Text fontSize="10px" color="white">Best Relationship</Text>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box w={2} h={2} borderRadius="full" bg="#10b981" boxShadow="0 0 5px #10b981" />
                        <Text fontSize="10px" color="white">Best Fortune</Text>
                    </Box>
                </VStack>
            </Box>
        </Box>
    );
};
