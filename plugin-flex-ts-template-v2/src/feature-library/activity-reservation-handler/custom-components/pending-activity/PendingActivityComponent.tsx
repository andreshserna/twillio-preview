import React, { useEffect, useState } from 'react';
import { Flex, Text } from '@twilio-paste/core';

import { getPendingActivity } from '../../helpers/pendingActivity';
import WorkerActivity from '../../helpers/workerActivityHelper';

const PendingActivity = () => {
  const [clock, setClock] = useState(true);
  const [pendingActivity, setPendingActivity] = useState(getPendingActivity());

  useEffect(() => {
    const interval = setInterval(() => {
      setClock((currentClock) => !currentClock);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPendingActivity(getPendingActivity());
  }, [clock]);

  return (
    <>
      {pendingActivity && pendingActivity.name && WorkerActivity.activitySid !== pendingActivity.sid && (
        <Flex vertical marginRight="space20" hAlignContent="center">
          <Text as="p" color="colorTextInverse" fontSize="fontSize20" fontWeight="fontWeightBold">
            Pending Activity
          </Text>
          <Text as="p" color="colorTextInverse" fontSize="fontSize10" lineHeight="lineHeight10">
            {pendingActivity.name}
          </Text>
        </Flex>
      )}
    </>
  );
};

export default PendingActivity;
