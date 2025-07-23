'use client';


import type { FC } from 'react';
import 'swiper/css';

type TimelineSlideProps = {
    timestamp: string;
    title: string;
    url: string;
};


function formatTimestampToLabel(timestamp: string) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
}

export const TimelineSlide: FC<TimelineSlideProps> = ({ timestamp }) => {
    const label = formatTimestampToLabel(timestamp);

    return (
        <div className='timeline-slide'><p>{label}</p></div>
    );
}