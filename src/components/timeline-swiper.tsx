"use client";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import { TimelineSlide } from './timeline-slide';
import { FC } from 'react';
import { Video } from '@/types/video';

type TimelineSwiperProps = {
    videosList?: Video[];
    onSlideChange: (currentVideo: Video) => void;
};

export const TimelineSwiper: FC<TimelineSwiperProps> = ({ videosList, onSlideChange }) => {
    const handleOnSlideChange = (event: any) => {
        const currentIndex = event.activeIndex;
        const currentVideo = videosList?.[currentIndex];

        if (currentVideo) {
            onSlideChange(currentVideo);
        }
    };

    return (
        <Swiper
            spaceBetween={24}
            slidesPerView={1.2} // Default (mobile)
            initialSlide={0}
            slideToClickedSlide={true}
            breakpoints={{
                475: {
                    slidesPerView: 1.7,
                },
                600: {
                    slidesPerView: 2.2,
                },
                992: {
                    slidesPerView: 3.2,
                    centeredSlides: true,
                },
            }}
            onSlideChange={handleOnSlideChange}
            navigation={true}
            modules={[Navigation]}
            centeredSlides={true}
        >
            {videosList?.map((video, index) => (
                <SwiperSlide key={index}>
                    <TimelineSlide timestamp={video.timestamp} title={video.title} url={video.url} />
                </SwiperSlide>
            ))}
        </Swiper>
    );
}